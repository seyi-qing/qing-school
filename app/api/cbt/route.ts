import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const ExamSchema = z.object({
  title: z.string().min(1).max(200),
  durationMinutes: z.coerce.number().int().min(5).max(180).default(30),
  armId: z.string().optional(),
  negativeMark: z.coerce.number().min(0).max(1).default(0),
  proctoring: z.boolean().default(true),
});

const QuestionSchema = z.object({
  examId: z.string(),
  prompt: z.string().min(1),
  type: z.enum(["MCQ", "ESSAY"]).default("MCQ"),
  options: z.array(z.string()).optional(),
  correctIndex: z.coerce.number().int().min(0).optional(),
  marks: z.coerce.number().min(0.5).default(1),
  bankId: z.string().optional(),
});

const BankSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(["MCQ", "ESSAY"]).default("MCQ"),
  options: z.array(z.string()).optional(),
  correctIndex: z.coerce.number().int().min(0).optional(),
  subjectTag: z.string().max(80).optional(),
  marks: z.coerce.number().min(0.5).default(1),
});

const SubmitSchema = z.object({
  examId: z.string(),
  answers: z.record(z.string(), z.union([z.number(), z.string()])),
  proctorLog: z
    .array(
      z.object({
        event: z.string(),
        at: z.string(),
      })
    )
    .optional(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const examId = url.searchParams.get("examId");
  const bank = url.searchParams.get("bank");

  if (bank === "1") {
    if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const items = await prisma.cbtBankQuestion.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({
      bank: items.map((q) => ({
        ...q,
        options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : [],
      })),
    });
  }

  if (examId) {
    const exam = await prisma.cbtExam.findUnique({
      where: { id: examId },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const questions = exam.questions.map((q) => {
      const base = {
        id: q.id,
        prompt: q.prompt,
        type: q.type,
        marks: q.marks,
        options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : [],
      };
      if (session.role === "STUDENT") return base;
      return { ...base, correctIndex: q.correctIndex };
    });

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        negativeMark: exam.negativeMark,
        proctoring: exam.proctoring,
        isOpen: exam.isOpen,
        questions,
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

  // Save to question bank
  if (body?.action === "bank") {
    if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = BankSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid bank item" }, { status: 400 });
    const item = await prisma.cbtBankQuestion.create({
      data: {
        prompt: parsed.data.prompt,
        type: parsed.data.type,
        optionsJson:
          parsed.data.type === "MCQ" ? JSON.stringify(parsed.data.options || []) : null,
        correctIndex: parsed.data.type === "MCQ" ? parsed.data.correctIndex ?? 0 : null,
        subjectTag: parsed.data.subjectTag || null,
        marks: parsed.data.marks,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  }

  // Import bank question into exam
  if (body?.action === "importBank" && body?.examId && body?.bankId) {
    if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const bankQ = await prisma.cbtBankQuestion.findUnique({ where: { id: body.bankId } });
    if (!bankQ) return NextResponse.json({ error: "Bank item not found" }, { status: 404 });
    const count = await prisma.cbtQuestion.count({ where: { examId: body.examId } });
    const q = await prisma.cbtQuestion.create({
      data: {
        examId: body.examId,
        prompt: bankQ.prompt,
        type: bankQ.type,
        optionsJson: bankQ.optionsJson,
        correctIndex: bankQ.correctIndex,
        marks: bankQ.marks,
        order: count + 1,
        bankId: bankQ.id,
      },
    });
    return NextResponse.json({ question: q }, { status: 201 });
  }

  // Student submit
  if (body?.answers && body?.examId) {
    if (session.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students submit" }, { status: 403 });
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
    let totalMarks = 0;
    let pendingEssay = 0;

    for (const q of exam.questions) {
      totalMarks += q.marks;
      const ans = parsed.data.answers[q.id];
      if (q.type === "ESSAY") {
        pendingEssay++;
        // Essays: 0 auto marks; staff grades later via pending flag
        continue;
      }
      if (typeof ans === "number" && ans === q.correctIndex) {
        score += q.marks;
      } else if (typeof ans === "number" && exam.negativeMark > 0) {
        score -= exam.negativeMark * q.marks;
      }
    }
    if (score < 0) score = 0;
    const percent = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    const attempt = await prisma.cbtAttempt.create({
      data: {
        examId: exam.id,
        studentId: student.id,
        score,
        total: totalMarks,
        percent,
        answersJson: JSON.stringify(parsed.data.answers),
        proctorJson: JSON.stringify(parsed.data.proctorLog || []),
        needsGrading: pendingEssay > 0,
      },
    });

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        score,
        total: totalMarks,
        percent,
        needsGrading: pendingEssay > 0,
        proctorEvents: (parsed.data.proctorLog || []).length,
      },
    });
  }

  // Add question to exam
  if (body?.prompt && body?.examId) {
    if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = QuestionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, { status: 400 });
    const type = parsed.data.type;
    if (type === "MCQ") {
      const opts = parsed.data.options || [];
      if (opts.length < 2) {
        return NextResponse.json({ error: "MCQ needs at least 2 options" }, { status: 400 });
      }
    }
    const count = await prisma.cbtQuestion.count({ where: { examId: parsed.data.examId } });
    const q = await prisma.cbtQuestion.create({
      data: {
        examId: parsed.data.examId,
        prompt: parsed.data.prompt,
        type,
        optionsJson: type === "MCQ" ? JSON.stringify(parsed.data.options || []) : null,
        correctIndex: type === "MCQ" ? parsed.data.correctIndex ?? 0 : null,
        marks: parsed.data.marks,
        order: count + 1,
        bankId: parsed.data.bankId || null,
      },
    });
    return NextResponse.json({ question: q }, { status: 201 });
  }

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
      negativeMark: parsed.data.negativeMark,
      proctoring: parsed.data.proctoring,
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
