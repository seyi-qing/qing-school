import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole, can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FeeStructureClient } from "./FeeStructureClient";

export const dynamic = "force-dynamic";

export default async function FeeStructurePage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_FEES") && session.role !== "SECRETARY") {
    redirect(homeRouteForRole(session.role));
  }

  const [arms, terms, items] = await Promise.all([
    prisma.arm.findMany({
      include: { schoolClass: true },
      orderBy: [{ schoolClass: { order: "asc" } }, { name: "asc" }],
    }),
    prisma.term.findMany({ orderBy: { startDate: "desc" } }),
    prisma.feeItem.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <PortalShell
      role={session.role}
      title="Fee structure"
      subtitle="Define class/term fees and generate student invoices"
      actions={
        <Link href="/fees" className="text-sm border border-navy text-navy px-3 py-1.5">
          Back to Fees
        </Link>
      }
    >
      {arms.length === 0 ? (
        <p className="text-sm text-ink/50">Create classes and arms first under Classes.</p>
      ) : (
        <FeeStructureClient
          arms={arms.map((a) => ({
            id: a.id,
            label: `${a.schoolClass.name} ${a.name}`,
          }))}
          terms={terms.map((t) => ({
            id: t.id,
            name: t.name,
            isCurrent: t.isCurrent,
          }))}
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            amount: i.amount,
            compulsory: i.compulsory,
            armId: i.armId,
            termId: i.termId,
          }))}
        />
      )}
    </PortalShell>
  );
}
