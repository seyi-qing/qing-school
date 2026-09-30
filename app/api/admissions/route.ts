import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const ApplicationSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  otherNames: z.string().max(80).optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().max(300).optional(),
  previousSchool: z.string().max(150).optional(),
  parentName: z.string().min(1).max(120),
  parentPhone: z.string().min(7).max(20),
  parentEmail: z.string().email().optional().or(z.literal("")),
  desiredClass: z.string().max(80).optional(),
});

async function nextAdmissionNumber() {
  const year = new Date().getFullYear();
  const prefix = `KMS/${year}/`;
  const last = await prisma.student.findFirst({
    where: { admissionNumber: { startsWith: prefix } },
    orderBy: { admissionNumber: "desc" },
  });
  let seq = 1;
  if (last) {
    const n = parseInt(last.admissionNumber.split("/").pop() || "0", 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/**
 * Public online admission application.
 * Creates a student with status APPLIED for office review.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const admissionNumber = await nextAdmissionNumber();

  const student = await prisma.student.create({
    data: {
      admissionNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      otherNames: data.otherNames || null,
      gender: data.gender || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      address: data.address || null,
      previousSchool: data.previousSchool || null,
      status: "APPLIED",
    },
  });

  await logAudit({
    action: "ADMISSION_APPLICATION",
    entityType: "Student",
    entityId: student.id,
    detail: JSON.stringify({ admissionNumber, parentName: data.parentName, parentPhone: data.parentPhone }),
  });

  return NextResponse.json({
    admissionNumber,
    message: `Application received for ${data.firstName} ${data.lastName}. Save your admission number for follow-up.`,
  });
}
