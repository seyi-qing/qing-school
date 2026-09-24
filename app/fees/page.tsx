import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { formatNaira } from "@/lib/format";
import { CollectPaymentForm } from "./CollectPaymentForm";
import { redirect } from "next/navigation";
import { homeRouteForRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "ACCOUNTANT", "SECRETARY"];

export default async function FeesPage() {
  const session = await requireSession();
  if (!ALLOWED_ROLES.includes(session.role)) redirect(homeRouteForRole(session.role));

  const [invoices, totalCollected, allInvoices] = await Promise.all([
    prisma.invoice.findMany({
      include: { student: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.invoice.aggregate({ _sum: { amountPaid: true } }),
    prisma.invoice.findMany(),
  ]);

  const outstanding = allInvoices.reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0);
  const debtors = allInvoices.filter((i) => i.status !== "PAID");

  return (
    <PortalShell role={session.role} title="Fees & Accounts" subtitle="Invoices, payments and debtors">
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="ledger-block">
          <p className="text-xs uppercase tracking-wide text-ink/50">Total Collected</p>
          <p className="ledger-number text-2xl text-sage mt-1">{formatNaira(totalCollected._sum.amountPaid ?? 0)}</p>
        </div>
        <div className="ledger-block">
          <p className="text-xs uppercase tracking-wide text-ink/50">Total Outstanding</p>
          <p className="ledger-number text-2xl text-brick mt-1">{formatNaira(outstanding)}</p>
        </div>
        <div className="ledger-block">
          <p className="text-xs uppercase tracking-wide text-ink/50">Students Owing</p>
          <p className="ledger-number text-2xl mt-1">{debtors.length}</p>
        </div>
      </div>

      <section className="ledger-block !p-0 overflow-x-auto">
        <div className="p-4 pb-0"><h2 className="font-serif text-lg">Recent Invoices</h2></div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>Student</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Collect</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const bal = inv.totalAmount - inv.amountPaid;
              return (
                <tr key={inv.id}>
                  <td>{inv.student.lastName}, {inv.student.firstName}</td>
                  <td>{formatNaira(inv.totalAmount)}</td>
                  <td>{formatNaira(inv.amountPaid)}</td>
                  <td>{formatNaira(bal)}</td>
                  <td><span className="status-pill">{inv.status}</span></td>
                  <td>{bal > 0 ? <CollectPaymentForm invoiceId={inv.id} maxAmount={bal} /> : "—"}</td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr><td colSpan={6} className="text-center text-ink/50 py-8">No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </PortalShell>
  );
}
