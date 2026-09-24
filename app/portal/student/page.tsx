import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { PayOnlineButton } from "@/components/PayOnlineButton";
import { formatNaira, formatDate } from "@/lib/format";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentPortalPage() {
  const session = await requireSession();
  if (session.role !== "STUDENT") redirect("/dashboard");

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    include: {
      arm: { include: { schoolClass: true } },
      invoices: { orderBy: { createdAt: "desc" } },
      scores: { include: { armSubject: { include: { subject: true } } } },
      attendances: { orderBy: { date: "desc" }, take: 10 },
    },
  });

  if (!student) {
    return (
      <PortalShell role={session.role} title="My Portal">
        <p className="text-ink/60 text-sm">
          Your login isn&apos;t linked to a student profile yet. Ask the school office to link your
          account.
        </p>
      </PortalShell>
    );
  }

  const balance = student.invoices.reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0);
  const unpaid = student.invoices.filter((i) => i.status !== "PAID");

  return (
    <PortalShell
      role={session.role}
      title={`Welcome, ${student.firstName}`}
      subtitle={
        student.arm
          ? `${student.arm.schoolClass.name} ${student.arm.name} · ${student.admissionNumber}`
          : student.admissionNumber
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Fee balance</p>
          <p className={`ledger-number text-2xl mt-1 ${balance > 0 ? "text-brick" : "text-sage"}`}>
            {formatNaira(balance)}
          </p>
        </div>
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Subjects scored</p>
          <p className="ledger-number text-2xl mt-1">{student.scores.length}</p>
        </div>
        <div className="ledger-block col-span-2 md:col-span-1">
          <p className="text-xs uppercase text-ink/50">Admission no.</p>
          <p className="ledger-number text-lg mt-1 font-mono">{student.admissionNumber}</p>
        </div>
      </div>

      {unpaid.length > 0 && (
        <section className="ledger-block mb-6">
          <h2 className="font-serif text-lg mb-3">Pay fees online</h2>
          <ul className="space-y-3">
            {unpaid.map((inv) => {
              const bal = inv.totalAmount - inv.amountPaid;
              return (
                <li
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm border-b border-line pb-3"
                >
                  <div>
                    <span className="font-medium">{formatNaira(bal)}</span>
                    <span className="text-ink/50 text-xs ml-2">of {formatNaira(inv.totalAmount)}</span>
                    <span className="status-pill text-xs ml-2">{inv.status}</span>
                  </div>
                  <PayOnlineButton
                    invoiceId={inv.id}
                    maxAmount={bal}
                    defaultEmail={session.email}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <section className="ledger-block !p-0 overflow-x-auto">
          <div className="p-4 pb-0">
            <h2 className="font-serif text-lg">Recent scores</h2>
          </div>
          <table className="ledger mt-2">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Total</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {student.scores.slice(0, 8).map((sc) => (
                <tr key={sc.id}>
                  <td>{sc.armSubject.subject.name}</td>
                  <td>{sc.total}</td>
                  <td>{sc.grade ?? "-"}</td>
                </tr>
              ))}
              {student.scores.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-ink/50 py-6">
                    No scores yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Recent attendance</h2>
          <ul className="text-sm space-y-1">
            {student.attendances.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-line py-1.5">
                <span>{formatDate(a.date)}</span>
                <span className="status-pill text-xs">{a.status}</span>
              </li>
            ))}
            {student.attendances.length === 0 && (
              <li className="text-ink/50">No attendance recorded yet.</li>
            )}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href={`/students/${student.id}`} className="text-navy underline">
              Full record
            </Link>
            <Link href={`/students/${student.id}/report-card`} className="text-navy underline">
              Report card
            </Link>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
