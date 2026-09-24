import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const CreateStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  otherNames: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  previousSchool: z.string().optional(),
  medicalNotes: z.string().optional(),
  armId: z.string().optional(),
});

async function generateAdmissionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countThisYear = await prisma.student.count({
    where: { admissionNumber: { startsWith: `FS/${year}/` } },
  });
  const next = String(countThisYear + 1).padStart(4, "0");
  return `FS/${year}/${next}`;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const armId = searchParams.get("armId") ?? undefined;

  const students = await prisma.student.findMany({
    where: {
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
    return NextResponse.json({ error: "You don't have permission to admit students." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const admissionNumber = await generateAdmissionNumber();
  const data = parsed.data;

  const student = await prisma.student.create({
    data: {
      admissionNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      otherNames: data.otherNames,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      address: data.address,
      previousSchool: data.previousSchool,
      medicalNotes: data.medicalNotes,
      armId: data.armId || undefined,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE_STUDENT",
    entity: "Student",
    entityId: student.id,
    details: { admissionNumber },
  });

  return NextResponse.json({ student }, { status: 201 });
}
