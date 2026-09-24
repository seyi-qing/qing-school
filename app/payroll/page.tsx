import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { formatNaira } from "@/lib/format";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PayrollRunner } from "./PayrollRunner";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_PAYROLL")) redirect("/dashboard");

  const payslips = await prisma.payslip.findMany({
    include: { staff: true },
    orderBy: { generatedAt: "desc" },
    take: 50,
  });

  return (
    <PortalShell role={session.role} title="Payroll" subtitle="Salary structure, deductions, payslip generation">
      <PayrollRunner />

      <section className="ledger-block !p-0 overflow-x-auto mt-6">
        <div className="p-4">
          <h2 className="font-serif text-lg">Recent Payslips</h2>
        </div>
        <table className="ledger">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Month</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id}>
                <td>{p.staff.lastName}, {p.staff.firstName}</td>
                <td>{p.month}</td>
                <td>{formatNaira(p.gross)}</td>
                <td>{formatNaira(p.deductions)}</td>
                <td className="font-medium">{formatNaira(p.net)}</td>
              </tr>
            ))}
            {payslips.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink/50 py-8">No payslips generated yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </PortalShell>
  );
}
