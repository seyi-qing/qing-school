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
        <p className="text-ink/60">
          Your login isn&apos;t linked to a student profile yet. Ask the school office to link your
          account.
        </p>
      </PortalShell>
    );
  }

  const balance = student.invoices.reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0);

  return (
    <PortalShell
      role={session.role}
      title={`Welcome, ${student.firstName}`}
      subtitle={student.arm ? `${student.arm.schoolClass.name} ${student.arm.name}` : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Fee Balance</p>
          <p className={`ledger-number text-2xl mt-1 ${balance > 0 ? "text-brick" : "text-sage"}`}>
            {formatNaira(balance)}
          </p>
        </div>
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Subjects scored</p>
          <p className="ledger-number text-2xl mt-1">{student.scores.length}</p>
        </div>
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Admission No.</p>
          <p className="ledger-number text-lg mt-1 font-mono">{student.admissionNumber}</p>
        </div>
      </div>

      <section className="ledger-block !p-0 overflow-x-auto mb-6">
        <div className="p-4 pb-0">
          <h2 className="font-serif text-lg">My invoices</h2>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Pay</th>
            </tr>
          </thead>
          <tbody>
            {student.invoices.map((inv) => {
              const bal = inv.totalAmount - inv.amountPaid;
              return (
                <tr key={inv.id}>
                  <td>{formatNaira(inv.totalAmount)}</td>
                  <td>{formatNaira(inv.amountPaid)}</td>
                  <td className={bal > 0 ? "text-brick" : ""}>{formatNaira(bal)}</td>
                  <td>
                    <span className="status-pill text-xs">{inv.status}</span>
                  </td>
                  <td>
                    {bal > 0 && (
                      <PayOnlineButton
                        invoiceId={inv.id}
                        maxAmount={bal}
                        defaultEmail={session.email}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {student.invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink/50 py-6">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <section className="ledger-block !p-0 overflow-x-auto">
          <div className="p-4 pb-0">
            <h2 className="font-serif text-lg">My Results</h2>
          </div>
          <table className="ledger mt-3">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Total</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {student.scores.map((s) => (
                <tr key={s.id}>
                  <td>{s.armSubject.subject.name}</td>
                  <td>{s.total}</td>
                  <td>{s.grade ?? "-"}</td>
                </tr>
              ))}
              {student.scores.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-ink/50 py-6">
                    No results published yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Recent Attendance</h2>
          <ul className="text-sm space-y-1">
            {student.attendances.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-line py-1 last:border-0">
                <span>{formatDate(a.date)}</span>
                <span className="status-pill">{a.status}</span>
              </li>
            ))}
            {student.attendances.length === 0 && (
              <li className="text-ink/50">No attendance recorded yet.</li>
            )}
          </ul>
        </section>
      </div>
    </PortalShell>
  );
}
