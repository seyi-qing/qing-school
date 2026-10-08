import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { PayOnlineButton } from "@/components/PayOnlineButton";
import { formatNaira } from "@/lib/format";
import { toMoney } from "@/lib/money";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBrandingForSchoolId } from "@/lib/branding";
import { resolveSchoolId } from "@/lib/tenant-scope";

export const dynamic = "force-dynamic";

function invoiceBalance(total: unknown, paid: unknown) {
  return toMoney(total) - toMoney(paid);
}

export default async function ParentPortalPage() {
  const session = await requireSession();
  if (session.role !== "PARENT") redirect("/dashboard");

  const schoolId = await resolveSchoolId(session);
  const brand = await getBrandingForSchoolId(schoolId);

  const links = await prisma.parentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        include: {
          arm: { include: { schoolClass: true } },
          invoices: { orderBy: { createdAt: "desc" }, take: 10 },
          attendances: { orderBy: { date: "desc" }, take: 8 },
        },
      },
    },
  });

  return (
    <PortalShell
      role={session.role}
      title="Family dashboard"
      subtitle={`${brand.shortName} · balances, attendance and notices for your children`}
      email={session.email}
    >
      {links.length === 0 ? (
        <EmptyState
          title="No children linked"
          description="Contact the school office to link your wards to this parent account."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(() => {
              const totalBalance = links.reduce(
                (sum, l) =>
                  sum +
                  l.student.invoices.reduce(
                    (s, i) => s + invoiceBalance(i.totalAmount, i.amountPaid),
                    0
                  ),
                0
              );
              const absences = links.reduce(
                (sum, l) =>
                  sum + l.student.attendances.filter((a) => a.status === "ABSENT").length,
                0
              );
              return (
                <>
                  <div className="ledger-block p-4">
                    <p className="text-xs uppercase tracking-wide text-ink/50">Children</p>
                    <p className="font-serif text-2xl mt-1">{links.length}</p>
                  </div>
                  <div className="ledger-block p-4">
                    <p className="text-xs uppercase tracking-wide text-ink/50">Total balance</p>
                    <p className="font-serif text-2xl mt-1 text-brick">{formatNaira(totalBalance)}</p>
                  </div>
                  <div className="ledger-block p-4">
                    <p className="text-xs uppercase tracking-wide text-ink/50">Recent absences</p>
                    <p className="font-serif text-2xl mt-1">{absences}</p>
                  </div>
                  <div className="ledger-block p-4">
                    <p className="text-xs uppercase tracking-wide text-ink/50">Next step</p>
                    <p className="text-sm mt-2 text-navy font-medium">
                      {totalBalance > 0 ? "Pay fees" : "All clear"}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {links.map((link) => {
              const s = link.student;
              const balance = s.invoices.reduce(
                (sum, i) => sum + invoiceBalance(i.totalAmount, i.amountPaid),
                0
              );
              const lastAbsence = s.attendances.find((a) => a.status === "ABSENT");
              const unpaid = s.invoices.filter((i) => i.status !== "PAID");
              const classLabel = s.arm
                ? `${s.arm.schoolClass.name} ${s.arm.name}`
                : "Class not assigned";

              return (
                <section key={s.id} className="ledger-block p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-serif text-lg">
                        {s.firstName} {s.lastName}
                      </h2>
                      <p className="text-xs text-ink/50">
                        {s.admissionNumber} · {classLabel}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        balance > 0 ? "bg-brick/10 text-brick" : "bg-sage/15 text-sage"
                      }`}
                    >
                      {balance > 0 ? "Fees due" : "Paid up"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-paper/80 border border-line p-3 rounded">
                      <p className="text-xs text-ink/50">Balance</p>
                      <p className="font-medium text-lg">{formatNaira(balance)}</p>
                    </div>
                    <div className="bg-paper/80 border border-line p-3 rounded">
                      <p className="text-xs text-ink/50">Last absence</p>
                      <p className="font-medium">
                        {lastAbsence
                          ? new Date(lastAbsence.date).toLocaleDateString("en-NG")
                          : "None recent"}
                      </p>
                    </div>
                  </div>

                  {unpaid.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-ink/50">Open invoices</p>
                      <ul className="text-sm space-y-1">
                        {unpaid.slice(0, 3).map((inv) => (
                          <li key={inv.id} className="flex justify-between gap-2">
                            <span className="text-ink/70 truncate">
                              {inv.status} ·{" "}
                              {formatNaira(invoiceBalance(inv.totalAmount, inv.amountPaid))} due
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-1">
                        {unpaid[0] && (
                          <PayOnlineButton
                            invoiceId={unpaid[0].id}
                            maxAmount={invoiceBalance(
                              unpaid[0].totalAmount,
                              unpaid[0].amountPaid
                            )}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {balance <= 0 && unpaid.length === 0 && (
                    <p className="text-xs text-sage">No outstanding fees for this child.</p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-line">
                    <Link
                      href={`/students/${s.id}/report-card`}
                      className="text-xs text-navy underline"
                    >
                      Report card
                    </Link>
                    <Link href="/notices" className="text-xs text-navy underline">
                      School notices
                    </Link>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </PortalShell>
  );
}
