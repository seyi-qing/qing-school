import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { can, homeRouteForRole } from "@/lib/permissions";
import { formatNaira, formatDate } from "@/lib/format";
import { redirect } from "next/navigation";
import { ExpenseForm } from "./ExpenseForm";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_EXPENSES")) redirect(homeRouteForRole(session.role));

  const [expenses, incomeAgg, expenseAgg] = await Promise.all([
    prisma.expenseRecord.findMany({ orderBy: { date: "desc" }, take: 100 }),
    prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
    prisma.expenseRecord.aggregate({ _sum: { amount: true } }),
  ]);

  const income = incomeAgg._sum.amount ?? 0;
  const expenseTotal = expenseAgg._sum.amount ?? 0;
  const net = income - expenseTotal;

  return (
    <PortalShell role={session.role} title="Expenses" subtitle="School spending and simple P&amp;L">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Fee income (recorded)</p>
          <p className="ledger-number text-2xl text-sage mt-1">{formatNaira(income)}</p>
        </div>
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Total expenses</p>
          <p className="ledger-number text-2xl text-brick mt-1">{formatNaira(expenseTotal)}</p>
        </div>
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Net (income − expenses)</p>
          <p className={`ledger-number text-2xl mt-1 ${net >= 0 ? "text-sage" : "text-brick"}`}>
            {formatNaira(net)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="ledger-block lg:col-span-1">
          <h2 className="font-serif text-lg mb-3">Record expense</h2>
          <ExpenseForm />
        </section>

        <section className="ledger-block !p-0 overflow-x-auto lg:col-span-2">
          <div className="p-4 pb-0">
            <h2 className="font-serif text-lg">Recent expenses</h2>
          </div>
          <table className="ledger mt-3">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="text-xs whitespace-nowrap">{formatDate(e.date)}</td>
                  <td>{e.category}</td>
                  <td>{e.description}</td>
                  <td className="text-brick">{formatNaira(e.amount)}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-ink/50 py-8">
                    No expenses recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </PortalShell>
  );
}
