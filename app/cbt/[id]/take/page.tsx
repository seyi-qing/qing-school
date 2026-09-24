import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { notFound, redirect } from "next/navigation";
import { TakeExamClient } from "./TakeExamClient";

export const dynamic = "force-dynamic";

export default async function TakeExamPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const exam = await prisma.cbtExam.findUnique({
    where: { id: params.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!exam) notFound();

  if (session.role === "STUDENT") {
    if (!exam.isOpen) {
      return (
        <PortalShell role={session.role} title={exam.title}>
          <p className="text-sm text-ink/60">This test is closed.</p>
        </PortalShell>
      );
    }
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!student) redirect("/portal/student");
    const prior = await prisma.cbtAttempt.findFirst({
      where: { examId: exam.id, studentId: student.id },
    });
    if (prior) {
      return (
        <PortalShell role={session.role} title={exam.title}>
          <p className="text-sm">
            Already submitted: {prior.score}/{prior.total} ({prior.percent}%)
            {prior.needsGrading ? " — essays pending grade" : ""}
          </p>
        </PortalShell>
      );
    }
  } else if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
    redirect("/dashboard");
  }

  return (
    <PortalShell role={session.role} title={exam.title} subtitle={`${exam.durationMinutes} minutes`}>
      <TakeExamClient
        examId={exam.id}
        durationMinutes={exam.durationMinutes}
        canSubmit={session.role === "STUDENT"}
        proctoring={exam.proctoring}
        negativeMark={exam.negativeMark}
        questions={exam.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          marks: q.marks,
          options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : [],
        }))}
      />
    </PortalShell>
  );
}
