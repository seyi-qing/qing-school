import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { formatNaira } from "@/lib/format";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ParentPortalPage() {
  const session = await requireSession();
  if (session.role !== "PARENT") redirect("/dashboard");

  const links = await prisma.parentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        include: {
          arm: { include: { schoolClass: true } },
          invoices: true,
          attendances: { orderBy: { date: "desc" }, take: 5 },
        },
      },
    },
  });

  return (
    <PortalShell role={session.role} title="My Children" subtitle={`${links.length} child(ren) linked to your account`}>
      <div className="grid md:grid-cols-2 gap-6">
        {links.map((link) => {
          const s = link.student;
          const balance = s.invoices.reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);
          const presentRate = s.attendances.length
            ? Math.round((s.attendances.filter((a) => a.status === "PRESENT").length / s.attendances.length) * 100)
            : null;

          return (
            <section key={s.id} className="ledger-block">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-serif text-lg">{s.firstName} {s.lastName}</h2>
                <span className="text-xs text-ink/50">{link.relation}</span>
              </div>
              <p className="text-sm text-ink/60 mb-3">
                {s.arm ? `${s.arm.schoolClass.name} ${s.arm.name}` : "Unassigned"} · {s.admissionNumber}
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-ink/50">Fee balance</p>
                  <p className={`font-medium ${balance > 0 ? "text-brick" : "text-sage"}`}>{formatNaira(balance)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink/50">Recent attendance</p>
                  <p className="font-medium">{presentRate !== null ? `${presentRate}%` : "No data"}</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <Link href={`/students/${s.id}`} className="text-navy underline">Full record</Link>
                <Link href={`/students/${s.id}/report-card`} className="text-navy underline">Report card</Link>
                {balance > 0 && <Link href="/fees" className="text-navy underline">Pay fees</Link>}
              </div>
            </section>
          );
        })}
        {links.length === 0 && (
          <p className="text-ink/50">No children linked to your account yet. Contact the school office.</p>
        )}
      </div>
    </PortalShell>
  );
}
