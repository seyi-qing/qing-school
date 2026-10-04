import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { SCHOOL } from "@/lib/school-config";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GoLivePage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SYSTEM_SETTINGS")) redirect("/dashboard");

  const [
    studentCount,
    unassigned,
    applied,
    withdrawn,
    noticeCount,
    template,
    currentTerm,
    feeUnpaid,
  ] = await Promise.all([
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.student.count({ where: { status: "ACTIVE", armId: null } }),
    prisma.student.count({ where: { status: "APPLIED" } }),
    prisma.student.count({ where: { status: "WITHDRAWN" } }),
    prisma.notice.count(),
    prisma.reportCardTemplate.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.term.findFirst({ where: { isCurrent: true } }),
    prisma.invoice.count({ where: { status: { in: ["UNPAID", "PARTIAL"] } } }),
  ]);

  const tpl = template
    ? (JSON.parse(template.configJson) as { logoUrl?: string; schoolName?: string })
    : null;
  const brandingOk = SCHOOL.name.includes("Kayvlop") || SCHOOL.shortName === "KMS";
  const logoOk = !!(tpl?.logoUrl);

  const checks: { id: string; label: string; ok: boolean; fix?: string; href?: string }[] = [
    {
      id: "brand",
      label: "School branding is KMS / Kayvlop Magnificent School",
      ok: brandingOk,
      href: "/settings/report-template",
      fix: "Open report designer and save school name + Use school logo",
    },
    {
      id: "logo",
      label: "Report template has a logo saved",
      ok: logoOk,
      href: "/settings/report-template",
      fix: "Click Use school logo and Save layout",
    },
    {
      id: "term",
      label: "Current academic term is set",
      ok: !!currentTerm,
      href: "/settings",
      fix: "Set current session/term under Admin Settings",
    },
    {
      id: "students",
      label: `Active students on roll (${studentCount})`,
      ok: studentCount > 0,
      href: "/students",
    },
    {
      id: "unassigned",
      label: `Unassigned active students (${unassigned}) — ideally 0 for demo`,
      ok: unassigned === 0,
      href: "/students?status=ACTIVE",
      fix: "Use bulk assign class on Students page",
    },
    {
      id: "apps",
      label: `Pending applications (${applied})`,
      ok: true,
      href: "/students?status=APPLIED",
    },
    {
      id: "withdrawn",
      label: `Withdrawn records (${withdrawn}) — clean duplicates if any`,
      ok: true,
      href: "/students?status=WITHDRAWN",
    },
    {
      id: "fees",
      label: `Open fee invoices (${feeUnpaid})`,
      ok: true,
      href: "/fees",
    },
    {
      id: "notices",
      label: `Notices posted (${noticeCount})`,
      ok: noticeCount > 0,
      href: "/notices",
      fix: "Post a welcome notice with KMS branding",
    },
    {
      id: "seed",
      label: "ALLOW_SETUP_SEED should be false after migration",
      ok: process.env.ALLOW_SETUP_SEED === "false",
      fix: "Vercel → Environment Variables → set ALLOW_SETUP_SEED=false and redeploy",
    },
    {
      id: "password",
      label: "Change admin password from demo Password123!",
      ok: false,
      href: "/settings",
      fix: "Change password for admin account before the school presentation",
    },
  ];

  const autoOk = checks.filter((c) => c.id !== "password" && c.ok).length;
  const autoTotal = checks.filter((c) => c.id !== "password").length;

  return (
    <PortalShell
      role={session.role}
      title="Go-live checklist"
      subtitle={`Phase 2–3 readiness · ${autoOk}/${autoTotal} automated checks passed`}
    >
      <div className="ledger-block mb-6">
        <p className="text-sm text-ink/70">
          Use this before presenting to <strong>{SCHOOL.name}</strong>. Complete every red item.
          Demo path: admit → assign class → invoice → notice → report card with logo.
        </p>
      </div>

      <ul className="space-y-2 mb-8">
        {checks.map((c) => (
          <li
            key={c.id}
            className={`ledger-block !p-3 flex flex-col sm:flex-row sm:items-center gap-2 ${
              c.ok ? "border-sage/40" : "border-brick/40"
            }`}
          >
            <span className={`text-sm font-medium ${c.ok ? "text-sage" : "text-brick"}`}>
              {c.ok ? "✓" : "○"} {c.label}
            </span>
            <span className="flex-1" />
            {c.fix && !c.ok && <span className="text-xs text-ink/60">{c.fix}</span>}
            {c.href && (
              <Link href={c.href} className="text-xs text-navy underline shrink-0">
                Open
              </Link>
            )}
          </li>
        ))}
      </ul>

      <section className="ledger-block space-y-3">
        <h2 className="font-serif text-lg">10-minute demo script</h2>
        <ol className="text-sm list-decimal pl-5 space-y-2 text-ink/80">
          <li>
            Public homepage — show KMS branding and contact details ({SCHOOL.contact.phone}).
          </li>
          <li>Login as admin → Dashboard overview.</li>
          <li>
            Students → Admit one learner with guardian phone → assign class (or bulk assign).
          </li>
          <li>Fees → open invoice / fee reminder (SMS if provider configured).</li>
          <li>Notices → post or show a KMS notice.</li>
          <li>
            Report card designer → Use school logo → Save → open a student report card and print
            preview.
          </li>
          <li>Withdraw vs delete: explain soft leave vs permanent duplicate cleanup.</li>
        </ol>
        <p className="text-xs text-ink/50 pt-2">
          Training roles: Secretary (admit, fees, notices), Principal (reports, settings), Teacher
          (attendance, scores).
        </p>
      </section>

      <p className="mt-6 text-sm">
        <Link href="/settings" className="text-navy underline">
          ← Back to Admin Settings
        </Link>
      </p>
    </PortalShell>
  );
}
