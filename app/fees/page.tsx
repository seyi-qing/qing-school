import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { FeeReminderButton } from "@/components/FeeReminderButton";
import { formatNaira } from "@/lib/format";
import { CollectPaymentForm } from "./CollectPaymentForm";
import { redirect } from "next/navigation";
import { can, homeRouteForRole } from "@/lib/permissions";
import Link from "next/link";

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
  const canRemind = can(session.role, "SEND_FEE_REMINDERS");
  const canExpenses = can(session.role, "MANAGE_EXPENSES");

  return (
    <PortalShell
      role={session.role}
      title="Fees & Accounts"
      subtitle="Invoices, payments and debtors"
      actions={
        <div className="flex flex-wrap gap-2 items-center">
          {canExpenses && (
            <Link
              href="/expenses"
              className="border border-navy text-navy text-sm px-3 py-1.5 hover:bg-navy hover:text-paper"
            >
              Expenses
            </Link>
          )}
          {canRemind && <FeeReminderButton />}
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="ledger-block">
          <p className="text-xs uppercase tracking-wide text-ink/50">Total Collected</p>
          <p className="ledger-number text-2xl text-sage mt-1">
            {formatNaira(totalCollected._sum.amountPaid ?? 0)}
          </p>
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
        <div className="p-4 pb-0 flex items-center justify-between">
          <h2 className="font-serif text-lg">Recent Invoices</h2>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>Student</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  {inv.student.lastName}, {inv.student.firstName}
                  <div className="text-xs text-ink/50 font-mono">{inv.student.admissionNumber}</div>
                </td>
                <td>{formatNaira(inv.totalAmount)}</td>
                <td>{formatNaira(inv.amountPaid)}</td>
                <td className={inv.totalAmount - inv.amountPaid > 0 ? "text-brick" : ""}>
                  {formatNaira(inv.totalAmount - inv.amountPaid)}
                </td>
                <td>
                  <span
                    className={`status-pill ${
                      inv.status === "PAID"
                        ? "text-sage"
                        : inv.status === "PARTIAL"
                          ? "text-gold-dark"
                          : "text-brick"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td>
                  {inv.status !== "PAID" && (
                    <CollectPaymentForm
                      invoiceId={inv.id}
                      maxAmount={inv.totalAmount - inv.amountPaid}
                    />
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-ink/50 py-8">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </PortalShell>
  );
}
