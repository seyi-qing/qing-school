import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell, StatBlock } from "@/components/PortalShell";
import { can, homeRouteForRole } from "@/lib/permissions";\nimport { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";
import { formatNaira } from "@/lib/format";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Staff operations dashboard only — students/parents/teachers use portals. */
export default async function DashboardPage() {
  const session = await requireSession();

  if (session.role === "STUDENT" || session.role === "PARENT" || session.role === "TEACHER") {
    redirect(homeRouteForRole(session.role));
  }

  const [studentCount, staffCount, classCount, todayAttendance, invoices, recentAudit] =
    await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.staff.count({ where: { isActive: true } }),
      prisma.schoolClass.count(),
      prisma.attendance.findMany({
        where: { date: { gte: new Date(new Date().toDateString()) } },
      }),
      prisma.invoice.findMany(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { email: true } } },
      }),
    ]);

  const collected = invoices.reduce((sum, i) => sum + Number(i.amountPaid), 0);
  const outstanding = invoices.reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.amountPaid)), 0);
  const presentToday = todayAttendance.filter((a) => a.status === "PRESENT").length;
  const attendancePct =
    todayAttendance.length > 0 ? Math.round((presentToday / todayAttendance.length) * 100) : null;

  const showFinancials = can(session.role, "VIEW_DASHBOARD_FINANCIALS");

  return (
    <PortalShell role={session.role} title="Dashboard" subtitle={`Welcome back, ${session.email}`}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatBlock label="Active Students" value={studentCount.toLocaleString()} />
        <StatBlock label="Staff on Roll" value={staffCount.toLocaleString()} />
        <StatBlock label="Classes" value={classCount.toLocaleString()} />
        <StatBlock
          label="Attendance Today"
          value={attendancePct !== null ? `${attendancePct}%` : "Not taken"}
          sublabel={
            todayAttendance.length
              ? `${presentToday}/${todayAttendance.length} marked present`
              : undefined
          }
        />
      </div>

      {showFinancials && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatBlock
            label="Fees Collected (This Term)"
            value={formatNaira(collected)}
            tone="positive"
          />
          <StatBlock
            label="Fees Outstanding"
            value={formatNaira(outstanding)}
            tone={outstanding > 0 ? "warning" : "default"}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-base sm:text-lg mb-3">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {actions.map(([label, href]) => (
              <Link key={href} href={href} className="border border-line bg-white px-3 py-3 hover:border-gold hover:bg-paper transition-colors">
                <span className="block font-medium">{label}</span>
                <span className="text-xs text-ink/50">Open workspace →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-base sm:text-lg mb-3">Recent activity</h2>
          <ul className="text-sm space-y-2">
            {recentAudit.length === 0 && <li className="text-ink/50">No activity recorded yet.</li>}
            {recentAudit.map((log) => (
              <li key={log.id} className="border-b border-line pb-2 last:border-0">
                <span className="text-ink/70 break-all">{log.user?.email ?? "System"}</span>{" "}
                <span className="text-ink/40">&middot;</span>{" "}
                <span>{log.action.replaceAll("_", " ").toLowerCase()}</span>{" "}
                <span className="text-ink/40 text-xs block sm:inline">
                  ({new Date(log.createdAt).toLocaleString()})
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PortalShell>
  );
}
