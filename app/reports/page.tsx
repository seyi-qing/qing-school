import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { homeRouteForRole } from "@/lib/permissions";

const REPORTS = [
  {
    title: "Student List",
    description: "All active students, with class and gender, as a spreadsheet.",
    href: "/api/reports/students",
  },
  {
    title: "Fee Defaulters",
    description: "Every student with an unpaid or partially paid invoice.",
    href: "/api/reports/debtors",
  },
  {
    title: "Attendance Sheet (last 30 days)",
    description: "Daily attendance status for every student, most recent first.",
    href: "/api/reports/attendance?days=30",
  },
];

export default async function ReportsPage() {
  const session = await requireSession();
  if (!can(session.role, "VIEW_REPORTS")) redirect(homeRouteForRole(session.role));

  return (
    <PortalShell role={session.role} title="Reports" subtitle="Export data as a spreadsheet (CSV)">
      <div className="grid md:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <div key={r.href} className="ledger-block flex flex-col justify-between">
            <div>
              <h2 className="font-serif text-lg mb-1">{r.title}</h2>
              <p className="text-sm text-ink/60">{r.description}</p>
            </div>
            <a
              href={r.href}
              className="mt-4 inline-block border border-navy text-navy text-sm px-4 py-2 hover:bg-navy hover:text-paper w-fit"
            >
              Download CSV
            </a>
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
