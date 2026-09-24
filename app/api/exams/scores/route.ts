import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { gradeFor } from "@/lib/grading";
import { logAudit } from "@/lib/audit";

const ScoreEntrySchema = z.object({
  armSubjectId: z.string(),
  termId: z.string(),
  scores: z.array(
    z.object({
      studentId: z.string(),
      ca1: z.coerce.number().min(0).max(100),
      ca2: z.coerce.number().min(0).max(100),
      exam: z.coerce.number().min(0).max(100),
    })
  ),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const armSubjectId = searchParams.get("armSubjectId");
  const termId = searchParams.get("termId");
  if (!armSubjectId || !termId) {
    return NextResponse.json({ error: "armSubjectId and termId are required." }, { status: 400 });
  }

  const scores = await prisma.score.findMany({ where: { armSubjectId, termId } });
  return NextResponse.json({ scores });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "ENTER_SCORES")) {
    return NextResponse.json({ error: "You don't have permission to enter scores." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ScoreEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid score data." }, { status: 400 });
  }
  const { armSubjectId, termId, scores } = parsed.data;

  for (const s of scores) {
    const total = s.ca1 + s.ca2 + s.exam;
    const { grade, remark } = await gradeFor(total);
    await prisma.score.upsert({
      where: { studentId_armSubjectId_termId: { studentId: s.studentId, armSubjectId, termId } },
      update: { ca1: s.ca1, ca2: s.ca2, exam: s.exam, total, grade, remark, enteredBy: session.userId },
      create: {
        studentId: s.studentId,
        armSubjectId,
        termId,
        ca1: s.ca1,
        ca2: s.ca2,
        exam: s.exam,
        total,
        grade,
        remark,
        enteredBy: session.userId,
      },
    });
  }

  await logAudit({
    userId: session.userId,
    action: "ENTER_SCORES",
    entity: "Score",
    details: { armSubjectId, termId, count: scores.length },
  });

  return NextResponse.json({ ok: true });
}
