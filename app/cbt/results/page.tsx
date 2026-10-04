import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GradeAttemptForm } from "./GradeAttemptForm";

export const dynamic = "force-dynamic";

export default async function CbtResultsPage() {
  const session = await requireSession();
  if (!["ADMIN", "IT", "TEACHER", "PRINCIPAL"].includes(session.role)) {
    redirect(homeRouteForRole(session.role));
  }

  const attempts = await prisma.cbtAttempt.findMany({
    include: {
      student: { select: { firstName: true, lastName: true, admissionNumber: true } },
      exam: { select: { title: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 80,
  });

  const pending = attempts.filter((a) => a.needsGrading);

  return (
    <PortalShell
      role={session.role}
      title="CBT results"
      subtitle={`${pending.length} need essay grading · ${attempts.length} recent attempts`}
      actions={
        <Link href="/cbt" className="text-sm border border-navy text-navy px-3 py-1.5">
          Back to CBT
        </Link>
      }
    >
      {pending.length > 0 && (
        <section className="ledger-block mb-6 space-y-3">
          <h2 className="font-serif text-lg">Pending essay grading</h2>
          {pending.map((a) => (
            <div key={a.id} className="border border-line p-3 text-sm space-y-2">
              <p className="font-medium">
                {a.student.lastName}, {a.student.firstName}{" "}
                <span className="text-ink/50 font-mono text-xs">{a.student.admissionNumber}</span>
              </p>
              <p className="text-xs text-ink/60">
                {a.exam.title} · auto score {a.score}/{a.total} ({a.percent}%) ·{" "}
                {a.submittedAt.toLocaleString()}
              </p>
              <GradeAttemptForm attemptId={a.id} currentScore={a.score} currentTotal={a.total} />
            </div>
          ))}
        </section>
      )}

      <section className="ledger-block !p-0 overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-serif text-lg">All recent attempts</h2>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>When</th>
              <th>Student</th>
              <th>Exam</th>
              <th>Score</th>
              <th>Proctor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => {
              let proctorCount = 0;
              try {
                proctorCount = a.proctorJson ? (JSON.parse(a.proctorJson) as unknown[]).length : 0;
              } catch {
                proctorCount = 0;
              }
              return (
                <tr key={a.id}>
                  <td className="text-xs">{a.submittedAt.toLocaleString()}</td>
                  <td>
                    {a.student.lastName}, {a.student.firstName}
                    <span className="block text-xs font-mono text-ink/50">
                      {a.student.admissionNumber}
                    </span>
                  </td>
                  <td>{a.exam.title}</td>
                  <td>
                    {a.score}/{a.total} ({a.percent}%)
                  </td>
                  <td className={proctorCount > 3 ? "text-brick" : ""}>{proctorCount} events</td>
                  <td>{a.needsGrading ? "Needs grading" : "Final"}</td>
                </tr>
              );
            })}
            {attempts.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-ink/50 py-8">
                  No attempts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </PortalShell>
  );
}
