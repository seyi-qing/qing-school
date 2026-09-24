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
  const prefix = `FS/${year}/`;
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid application" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const admissionNumber = await nextAdmissionNumber();

  const medicalNotes = [
    `Parent/Guardian: ${d.parentName}`,
    `Phone: ${d.parentPhone}`,
    d.parentEmail ? `Email: ${d.parentEmail}` : null,
    d.desiredClass ? `Desired class: ${d.desiredClass}` : null,
    "Source: Online admissions form",
  ]
    .filter(Boolean)
    .join(" | ");

  const student = await prisma.student.create({
    data: {
      admissionNumber,
      firstName: d.firstName,
      lastName: d.lastName,
      otherNames: d.otherNames || undefined,
      gender: d.gender,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : undefined,
      address: d.address || undefined,
      previousSchool: d.previousSchool || undefined,
      medicalNotes,
      status: "APPLIED",
    },
  });

  await logAudit({
    action: "ONLINE_ADMISSION_APPLICATION",
    entity: "Student",
    entityId: student.id,
    details: { admissionNumber, parentPhone: d.parentPhone },
  });

  return NextResponse.json({
    ok: true,
    admissionNumber,
    message:
      "Application received. The school office will contact you. Keep your application number.",
  });
}
