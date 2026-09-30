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
    where: { admissionNumber: { startsWith: `KMS/${year}/` } },
  });
  const next = String(countThisYear + 1).padStart(4, "0");
  return `KMS/${year}/${next}`;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "students:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");

  const students = await prisma.student.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { admissionNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { arm: { include: { class: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ students });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "students:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admissionNumber = await generateAdmissionNumber();
  const d = parsed.data;

  const student = await prisma.student.create({
    data: {
      admissionNumber,
      firstName: d.firstName,
      lastName: d.lastName,
      otherNames: d.otherNames,
      gender: d.gender,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : undefined,
      address: d.address,
      previousSchool: d.previousSchool,
      medicalNotes: d.medicalNotes,
      armId: d.armId || undefined,
      status: "ACTIVE",
    },
  });

  await logAudit({
    action: "STUDENT_CREATED",
    entity: "Student",
    entityId: student.id,
    actorId: session.userId,
    details: { admissionNumber },
  });

  return NextResponse.json({ student }, { status: 201 });
}
