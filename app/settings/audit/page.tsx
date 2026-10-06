import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const session = await requireSession();
  if (!["ADMIN", "IT", "PLATFORM_ADMIN"].includes(session.role)) {
    redirect(homeRouteForRole(session.role));
  }

  const schoolId = await resolveSchoolId(session);
  const where =
    session.role === "PLATFORM_ADMIN" ? {} : schoolWhere(schoolId);

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { email: true, role: true } },
      school: { select: { slug: true, shortName: true } },
    },
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
              <th>School</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                <td>
                  {l.user?.email ?? "-"}
                  {l.user?.role && (
                    <span className="block text-ink/40">{l.user.role}</span>
                  )}
                </td>
                <td className="font-mono text-ink/60">
                  {l.school?.slug ?? l.schoolId ?? "—"}
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
                <td colSpan={6} className="text-center text-ink/50 py-8">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink/50 mt-3">
        Older rows may still show <code>schoolId: null</code> in Details — snapshot from before
        backfill. New actions record the real school and full time.
      </p>
    </PortalShell>
  );
}
