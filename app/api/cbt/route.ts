import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const ExamSchema = z.object({
  title: z.string().min(1).max(200),
  durationMinutes: z.coerce.number().int().min(5).max(180).default(30),
  armId: z.string().optional(),
});

const QuestionSchema = z.object({
  examId: z.string(),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndex: z.coerce.number().int().min(0),
});

const SubmitSchema = z.object({
  examId: z.string(),
  answers: z.record(z.string(), z.coerce.number().int()),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const examId = new URL(req.url).searchParams.get("examId");

  if (examId) {
    const exam = await prisma.cbtExam.findUnique({
      where: { id: examId },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Students never see correctIndex
    if (session.role === "STUDENT") {
      return NextResponse.json({
        exam: {
          id: exam.id,
          title: exam.title,
          durationMinutes: exam.durationMinutes,
          questions: exam.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            options: JSON.parse(q.optionsJson) as string[],
          })),
        },
      });
    }

    return NextResponse.json({
      exam: {
        ...exam,
        questions: exam.questions.map((q) => ({
          ...q,
          options: JSON.parse(q.optionsJson) as string[],
        })),
      },
    });
  }

  const exams = await prisma.cbtExam.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ exams });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);

  // Student submit attempt
  if (body?.answers && body?.examId) {
    if (session.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students submit attempts" }, { status: 403 });
    }
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid answers" }, { status: 400 });

    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!student) return NextResponse.json({ error: "No student profile" }, { status: 400 });

    const exam = await prisma.cbtExam.findUnique({
      where: { id: parsed.data.examId },
      include: { questions: true },
    });
    if (!exam || !exam.isOpen) {
      return NextResponse.json({ error: "Exam not open" }, { status: 400 });
    }

    let score = 0;
    const total = exam.questions.length || 1;
    for (const q of exam.questions) {
      if (parsed.data.answers[q.id] === q.correctIndex) score++;
    }
    const percent = Math.round((score / total) * 100);

    const attempt = await prisma.cbtAttempt.create({
      data: {
        examId: exam.id,
        studentId: student.id,
        score,
        total,
        percent,
        answersJson: JSON.stringify(parsed.data.answers),
      },
    });

    return NextResponse.json({ attempt: { score, total, percent, id: attempt.id } });
  }

  // Add question
  if (body?.prompt && body?.examId) {
    if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = QuestionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, { status: 400 });
    if (parsed.data.correctIndex >= parsed.data.options.length) {
      return NextResponse.json({ error: "correctIndex out of range" }, { status: 400 });
    }
    const count = await prisma.cbtQuestion.count({ where: { examId: parsed.data.examId } });
    const q = await prisma.cbtQuestion.create({
      data: {
        examId: parsed.data.examId,
        prompt: parsed.data.prompt,
        optionsJson: JSON.stringify(parsed.data.options),
        correctIndex: parsed.data.correctIndex,
        order: count + 1,
      },
    });
    return NextResponse.json({ question: q }, { status: 201 });
  }

  // Toggle open
  if (body?.toggleExamId) {
    if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const exam = await prisma.cbtExam.findUnique({ where: { id: body.toggleExamId } });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await prisma.cbtExam.update({
      where: { id: exam.id },
      data: { isOpen: !exam.isOpen },
    });
    return NextResponse.json({ exam: updated });
  }

  // Create exam
  if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = ExamSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid exam" }, { status: 400 });

  const exam = await prisma.cbtExam.create({
    data: {
      title: parsed.data.title,
      durationMinutes: parsed.data.durationMinutes,
      armId: parsed.data.armId || null,
      createdBy: session.userId,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE_CBT_EXAM",
    entity: "CbtExam",
    entityId: exam.id,
  });

  return NextResponse.json({ exam }, { status: 201 });
}
