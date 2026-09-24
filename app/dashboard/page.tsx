import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell, StatBlock } from "@/components/PortalShell";
import { can } from "@/lib/permissions";
import { formatNaira } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();

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

  const collected = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const outstanding = invoices.reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);
  const presentToday = todayAttendance.filter((a) => a.status === "PRESENT").length;
  const attendancePct =
    todayAttendance.length > 0 ? Math.round((presentToday / todayAttendance.length) * 100) : null;

  const showFinancials = can(session.role, "VIEW_DASHBOARD_FINANCIALS");

  return (
    <PortalShell role={session.role} title="Dashboard" subtitle={`Welcome back, ${session.email}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBlock label="Active Students" value={studentCount.toLocaleString()} />
        <StatBlock label="Staff on Roll" value={staffCount.toLocaleString()} />
        <StatBlock label="Classes" value={classCount.toLocaleString()} />
        <StatBlock
          label="Attendance Today"
          value={attendancePct !== null ? `${attendancePct}%` : "Not taken"}
          sublabel={todayAttendance.length ? `${presentToday}/${todayAttendance.length} marked present` : undefined}
        />
      </div>

      {showFinancials && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <StatBlock label="Fees Collected" value={formatNaira(collected)} tone="positive" />
          <StatBlock label="Fees Outstanding" value={formatNaira(outstanding)} tone="warning" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Quick Links</h2>
          <ul className="text-sm space-y-2">
            <li><Link href="/students" className="text-navy underline">Students</Link></li>
            <li><Link href="/attendance" className="text-navy underline">Attendance</Link></li>
            <li><Link href="/fees" className="text-navy underline">Fees</Link></li>
            <li><Link href="/exams" className="text-navy underline">Exams</Link></li>
            <li><Link href="/reports" className="text-navy underline">Reports</Link></li>
          </ul>
        </section>
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Recent Activity</h2>
          <ul className="text-sm space-y-1">
            {recentAudit.map((a) => (
              <li key={a.id} className="border-b border-line py-1 last:border-0">
                <span className="font-medium">{a.action}</span>{" "}
                <span className="text-ink/50">{a.user?.email ?? "system"}</span>
              </li>
            ))}
            {recentAudit.length === 0 && <li className="text-ink/50">No activity yet.</li>}
          </ul>
        </section>
      </div>
    </PortalShell>
  );
}
