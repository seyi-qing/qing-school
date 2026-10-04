import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId, schoolWhere, assertUnderStudentCap } from "@/lib/tenant-scope";

const CreateStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  otherNames: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  previousSchool: z.string().optional(),
  medicalNotes: z.string().optional(),
  guardianPhone: z.string().optional(),
  armId: z.string().optional(),
  forceAdmit: z.boolean().optional(),
});

async function generateAdmissionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countThisYear = await prisma.student.count({
    where: { admissionNumber: { startsWith: `KMS/${year}/` } },
  });
  const next = String(countThisYear + 1).padStart(4, "0");
  return `KMS/${year}/${next}`;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const armId = searchParams.get("armId") ?? undefined;

  const schoolId = await resolveSchoolId(session);
  const students = await prisma.student.findMany({
    where: {
      ...schoolWhere(schoolId),
      status: "ACTIVE",
      armId: armId || undefined,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { admissionNumber: { contains: q } },
            ],
          }
        : {}),
    },
    include: { arm: { include: { schoolClass: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
  });

  return NextResponse.json({ students });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_STUDENTS")) {
    return NextResponse.json(
      { error: "You don't have permission to admit students." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const schoolId = await resolveSchoolId(session);
  if (schoolId) {
    const cap = await assertUnderStudentCap(schoolId);
    if (!cap.ok) return NextResponse.json({ error: cap.error }, { status: 403 });
  }

  if (!data.forceAdmit) {
    const candidates = await prisma.student.findMany({
      where: {
        ...schoolWhere(schoolId),
        status: { not: "WITHDRAWN" },
        firstName: { equals: data.firstName.trim(), mode: "insensitive" },
        lastName: { equals: data.lastName.trim(), mode: "insensitive" },
      },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        status: true,
        arm: { include: { schoolClass: true } },
      },
      take: 10,
    });

    if (candidates.length > 0) {
      return NextResponse.json(
        {
          error: "Possible duplicate student(s) found. Confirm before admitting again.",
          code: "DUPLICATE_NAME",
          duplicates: candidates.map((c) => ({
            id: c.id,
            admissionNumber: c.admissionNumber,
            name: `${c.lastName}, ${c.firstName}`,
            status: c.status,
            class: c.arm ? `${c.arm.schoolClass.name} ${c.arm.name}` : "Unassigned",
          })),
        },
        { status: 409 }
      );
    }
  }

  const admissionNumber = await generateAdmissionNumber();

  const student = await prisma.student.create({
    data: {
      schoolId: schoolId ?? undefined,
      admissionNumber,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      otherNames: data.otherNames,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      address: data.address,
      previousSchool: data.previousSchool,
      medicalNotes: data.medicalNotes,
      guardianPhone: data.guardianPhone,
      armId: data.armId || undefined,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE_STUDENT",
    entity: "Student",
    entityId: student.id,
    details: { admissionNumber, forcedDuplicate: !!data.forceAdmit },
  });

  return NextResponse.json({ student }, { status: 201 });
}
