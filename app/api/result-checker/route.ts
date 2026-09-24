import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const CheckSchema = z.object({
  admissionNumber: z.string().min(1),
  pin: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CheckSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter an admission number and PIN." }, { status: 400 });

  const { admissionNumber, pin } = parsed.data;

  const pinRecord = await prisma.resultPin.findUnique({ where: { code: pin } });
  if (!pinRecord) return NextResponse.json({ error: "Invalid PIN." }, { status: 404 });
  if (pinRecord.isUsed && pinRecord.usedBy !== admissionNumber) {
    return NextResponse.json({ error: "This PIN has already been used." }, { status: 410 });
  }

  const student = await prisma.student.findUnique({ where: { admissionNumber } });
  if (!student) return NextResponse.json({ error: "Admission number not found." }, { status: 404 });

  const scores = await prisma.score.findMany({
    where: { studentId: student.id, termId: pinRecord.termId },
    include: { armSubject: { include: { subject: true } } },
  });

  if (!pinRecord.isUsed) {
    await prisma.resultPin.update({
      where: { id: pinRecord.id },
      data: { isUsed: true, usedBy: admissionNumber, usedAt: new Date() },
    });
  }

  return NextResponse.json({
    student: { name: `${student.firstName} ${student.lastName}`, admissionNumber },
    scores: scores.map((s) => ({
      subject: s.armSubject.subject.name,
      total: s.total,
      grade: s.grade,
      remark: s.remark,
    })),
  });
}
