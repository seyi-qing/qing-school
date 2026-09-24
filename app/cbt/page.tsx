import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CbtStaffPanel } from "./CbtStaffPanel";

export const dynamic = "force-dynamic";

export default async function CbtPage() {
  const session = await requireSession();

  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    const exams = await prisma.cbtExam.findMany({
      where: { isOpen: true },
      orderBy: { createdAt: "desc" },
    });
    const attempts = student
      ? await prisma.cbtAttempt.findMany({
          where: { studentId: student.id },
          orderBy: { submittedAt: "desc" },
          take: 20,
        })
      : [];
    const attempted = new Set(attempts.map((a) => a.examId));

    return (
      <PortalShell role={session.role} title="CBT / Tests" subtitle="Open computer-based tests">
        <ul className="space-y-3">
          {exams.map((e) => (
            <li key={e.id} className="ledger-block flex flex-wrap justify-between gap-2 items-center">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-ink/50">{e.durationMinutes} minutes</p>
              </div>
              {attempted.has(e.id) ? (
                <span className="text-sm text-sage">Submitted</span>
              ) : (
                <Link
                  href={`/cbt/${e.id}/take`}
                  className="text-sm bg-navy text-paper px-3 py-1.5"
                >
                  Start test
                </Link>
              )}
            </li>
          ))}
          {exams.length === 0 && <p className="text-sm text-ink/50">No open tests right now.</p>}
        </ul>
        {attempts.length > 0 && (
          <section className="ledger-block mt-6">
            <h2 className="font-serif text-lg mb-2">Your results</h2>
            <ul className="text-sm space-y-1">
              {attempts.map((a) => (
                <li key={a.id} className="flex justify-between border-b border-line py-1">
                  <span className="text-ink/60">{a.submittedAt.toLocaleString()}</span>
                  <span>
                    {a.score}/{a.total} ({a.percent}%)
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </PortalShell>
    );
  }

  if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
    redirect(homeRouteForRole(session.role));
  }

  const exams = await prisma.cbtExam.findMany({
    include: { _count: { select: { questions: true, attempts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PortalShell role={session.role} title="CBT" subtitle="Create MCQ tests for students">
      <CbtStaffPanel
        exams={exams.map((e) => ({
          id: e.id,
          title: e.title,
          durationMinutes: e.durationMinutes,
          isOpen: e.isOpen,
          questionCount: e._count.questions,
          attemptCount: e._count.attempts,
        }))}
      />
    </PortalShell>
  );
}
