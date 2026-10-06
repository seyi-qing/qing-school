import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell, StatBlock } from "@/components/PortalShell";
import { can, homeRouteForRole } from "@/lib/permissions";
import { formatNaira, formatDateTime } from "@/lib/format";
import { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";
import { toMoney } from "@/lib/money";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Role-based command center for staff roles. */
export default async function DashboardPage() {
  const session = await requireSession();

  if (session.role === "STUDENT" || session.role === "PARENT" || session.role === "TEACHER") {
    redirect(homeRouteForRole(session.role));
  }

  const schoolId = await resolveSchoolId(session);
  const sw = schoolWhere(schoolId);

  const [
    studentCount,
    pendingAdmissions,
    staffCount,
    classCount,
    todayAttendance,
    invoices,
    recentAudit,
    leavePending,
  ] = await Promise.all([
    prisma.student.count({ where: { status: "ACTIVE", ...sw } }),
    prisma.student.count({ where: { status: "APPLIED", ...sw } }),
    prisma.staff.count({ where: { isActive: true, ...sw } }),
    prisma.schoolClass.count({ where: sw }),
    prisma.attendance.findMany({
      where: {
        date: { gte: new Date(new Date().toDateString()) },
        ...(schoolId ? { student: { schoolId } } : {}),
      },
    }),
    prisma.invoice.findMany({
      where: schoolId ? { student: { schoolId } } : {},
      select: { totalAmount: true, amountPaid: true, status: true },
    }),
    prisma.auditLog.findMany({
      where: schoolId && session.role !== "PLATFORM_ADMIN" ? { schoolId } : {},
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { email: true } } },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }).catch(() => 0),
  ]);

  const collected = invoices.reduce((sum, i) => sum + toMoney(i.amountPaid), 0);
  const outstanding = invoices.reduce(
    (sum, i) => sum + (toMoney(i.totalAmount) - toMoney(i.amountPaid)),
    0
  );
  const presentToday = todayAttendance.filter((a) => a.status === "PRESENT").length;
  const attendancePct =
    todayAttendance.length > 0
      ? Math.round((presentToday / todayAttendance.length) * 100)
      : null;

  const showFinancials = can(session.role, "VIEW_DASHBOARD_FINANCIALS");
  const isAccounts = session.role === "ACCOUNTANT";
  const isPrincipal = session.role === "PRINCIPAL";
  const isSecretary = session.role === "SECRETARY";

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
          <StatBlock label="Fees collected" value={formatNaira(collected)} />
          <StatBlock label="Outstanding" value={formatNaira(outstanding)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <section className="ledger-block">
          <h2 className="font-serif text-base sm:text-lg mb-3">Needs attention</h2>
          <ul className="text-sm space-y-2 text-ink/80">
            {pendingAdmissions > 0 && (
              <li>
                <Link href="/students?status=APPLIED" className="text-navy underline">
                  {pendingAdmissions} pending admission{pendingAdmissions === 1 ? "" : "s"}
                </Link>
              </li>
            )}
            {showFinancials && outstanding > 0 && (
              <li>
                <Link href="/fees" className="text-navy underline">
                  {formatNaira(outstanding)} in outstanding fees
                </Link>
              </li>
            )}
            {leavePending > 0 && (
              <li>
                <Link href="/leave" className="text-navy underline">
                  {leavePending} staff leave request{leavePending === 1 ? "" : "s"}
                </Link>
              </li>
            )}
            {attendancePct === null && (
              <li>
                <Link href="/attendance" className="text-navy underline">
                  Today's attendance not taken
                </Link>
              </li>
            )}
            {pendingAdmissions === 0 &&
              leavePending === 0 &&
              attendancePct !== null &&
              !(showFinancials && outstanding > 0) && (
                <li className="text-ink/50">Nothing urgent right now.</li>
              )}
          </ul>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-base sm:text-lg mb-3">Quick actions</h2>
          <div className="flex flex-col gap-2 text-sm">
            {(session.role === "ADMIN" ||
              session.role === "IT" ||
              session.role === "SECRETARY" ||
              session.role === "PLATFORM_ADMIN") && (
              <Link href="/students/new" className="text-navy underline hover:text-gold py-1">
                Admit a new student
              </Link>
            )}
            {(showFinancials || isSecretary) && (
              <Link href="/fees" className="text-navy underline hover:text-gold py-1">
                Collect a fee payment
              </Link>
            )}
            {(session.role === "ADMIN" ||
              session.role === "IT" ||
              session.role === "PLATFORM_ADMIN") && (
              <Link href="/attendance" className="text-navy underline hover:text-gold py-1">
                Take today's attendance
              </Link>
            )}
            {(session.role === "ADMIN" ||
              session.role === "PRINCIPAL" ||
              session.role === "SECRETARY" ||
              session.role === "IT" ||
              session.role === "PLATFORM_ADMIN") && (
              <Link href="/notices" className="text-navy underline hover:text-gold py-1">
                Post a notice
              </Link>
            )}
            {isAccounts && (
              <>
                <Link href="/expenses" className="text-navy underline hover:text-gold py-1">
                  Record an expense
                </Link>
                <Link href="/payroll" className="text-navy underline hover:text-gold py-1">
                  Open payroll
                </Link>
              </>
            )}
            {isPrincipal && (
              <Link href="/reports" className="text-navy underline hover:text-gold py-1">
                View reports
              </Link>
            )}
            {session.role === "PLATFORM_ADMIN" && (
              <Link href="/platform" className="text-navy underline hover:text-gold py-1">
                Platform control plane
              </Link>
            )}
          </div>
        </section>
      </div>

      <section className="ledger-block">
        <h2 className="font-serif text-base sm:text-lg mb-3">Recent activity</h2>
        <ul className="text-sm space-y-2">
          {recentAudit.length === 0 && (
            <li className="text-ink/50">No activity recorded yet.</li>
          )}
          {recentAudit.map((log) => (
            <li key={log.id} className="border-b border-line pb-2 last:border-0">
              <span className="text-ink/70 break-all">{log.user?.email ?? "System"}</span>{" "}
              <span className="font-mono text-xs">{log.action}</span>
              <span className="block text-xs text-ink/40">{formatDateTime(log.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </PortalShell>
  );
}
