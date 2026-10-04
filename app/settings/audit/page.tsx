import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const session = await requireSession();
  if (!["ADMIN", "IT"].includes(session.role)) {
    redirect(homeRouteForRole(session.role));
  }

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PortalShell
      role={session.role}
      title="Audit trail"
      subtitle="Who did what, and when (last 100 actions)"
      actions={
        <Link href="/settings" className="text-sm border border-navy text-navy px-3 py-1.5">
          Back to Settings
        </Link>
      }
    >
      <div className="ledger-block !p-0 overflow-x-auto">
        <table className="ledger text-xs">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{l.createdAt.toLocaleString("en-NG")}</td>
                <td>
                  {l.user?.email ?? "-"}
                  {l.user?.role && (
                    <span className="block text-ink/40">{l.user.role}</span>
                  )}
                </td>
                <td className="font-mono">{l.action}</td>
                <td>
                  {l.entity}
                  {l.entityId && (
                    <span className="block text-ink/40 font-mono truncate max-w-[8rem]">
                      {l.entityId}
                    </span>
                  )}
                </td>
                <td className="max-w-[14rem] truncate text-ink/60">
                  {l.details ? l.details.slice(0, 120) : "-"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink/50 py-8">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
