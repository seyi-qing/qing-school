import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ensureDefaultSchool, backfillSchoolIds } from "@/lib/tenant";
import { PlatformBillingForm } from "@/components/PlatformBillingForm";
import { isSubscriptionLive, PLAN_LIMITS } from "@/lib/integrations/subscriptions";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const session = await requireSession();
  if (!["PLATFORM_ADMIN", "ADMIN", "IT"].includes(session.role)) {
    redirect("/dashboard");
  }

  const defaultSchool = await ensureDefaultSchool();
  if (session.role === "PLATFORM_ADMIN" || session.role === "IT") {
    await backfillSchoolIds(defaultSchool.id);
  }

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, students: true } } },
  });

  const live = isSubscriptionLive();

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-navy text-paper px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-paper/50">SaaS control plane</p>
          <h1 className="font-serif text-xl">Platform · Schools & Billing</h1>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/onboarding" className="border border-paper/40 px-3 py-1.5 hover:border-gold">
            Onboard school
          </Link>
          <Link href="/dashboard" className="border border-paper/40 px-3 py-1.5 hover:border-gold">
            School dashboard
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="ledger-block">
            <p className="text-xs text-ink/50 uppercase">Schools</p>
            <p className="font-serif text-2xl mt-1">{schools.length}</p>
          </div>
          <div className="ledger-block">
            <p className="text-xs text-ink/50 uppercase">Active</p>
            <p className="font-serif text-2xl mt-1">{schools.filter((s) => s.isActive).length}</p>
          </div>
          <div className="ledger-block">
            <p className="text-xs text-ink/50 uppercase">Students</p>
            <p className="font-serif text-2xl mt-1">
              {schools.reduce((n, s) => n + s._count.students, 0)}
            </p>
          </div>
          <div className="ledger-block">
            <p className="text-xs text-ink/50 uppercase">Users</p>
            <p className="font-serif text-2xl mt-1">
              {schools.reduce((n, s) => n + s._count.users, 0)}
            </p>
          </div>
          <div className="ledger-block">
            <p className="text-xs text-ink/50 uppercase">Billing</p>
            <p className={`font-serif text-lg mt-1 ${live ? "text-sage" : "text-brick"}`}>
              {live ? "Live" : "Mock"}
            </p>
          </div>
        </div>

        <section className="ledger-block !p-0 overflow-x-auto">
          <div className="p-4 pb-0">
            <h2 className="font-serif text-lg">Tenants</h2>
          </div>
          <table className="ledger mt-3 text-sm">
            <thead>
              <tr>
                <th>School</th>
                <th>Slug</th>
                <th>Plan</th>
                <th>Cap</th>
                <th>Sub status</th>
                <th>Users</th>
                <th>Students</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="font-medium">{s.name}</span>
                    <span className="block text-xs text-ink/40">{s.shortName}</span>
                  </td>
                  <td className="font-mono text-xs">{s.slug}</td>
                  <td>{s.plan}</td>
                  <td>{s.maxStudents}</td>
                  <td className="text-xs">{s.subscriptionStatus || "NONE"}</td>
                  <td>{s._count.users}</td>
                  <td>{s._count.students}</td>
                  <td className={s.isActive ? "text-sage" : "text-brick"}>
                    {s.isActive ? "Active" : "Suspended"}
                    {s.isDemo ? " · Demo" : ""}
                  </td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-ink/50 py-8">
                    No schools yet. Use Onboard school.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <PlatformBillingForm
          schools={schools.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            plan: s.plan,
          }))}
        />

        <section className="ledger-block text-sm space-y-2">
          <h2 className="font-serif text-lg">Billing setup (production)</h2>
          <ol className="list-decimal pl-5 space-y-1 text-ink/70">
            <li>Create 3 Plans in Paystack (STARTER / PRO / ENTERPRISE) with monthly amounts.</li>
            <li>
              Set env: PAYSTACK_SECRET_KEY, PAYSTACK_PLAN_STARTER, PAYSTACK_PLAN_PRO,
              PAYSTACK_PLAN_ENTERPRISE, NEXT_PUBLIC_APP_URL.
            </li>
            <li>
              Webhook URL: <code className="text-xs">/api/webhooks/paystack</code>
            </li>
            <li>
              Limits: STARTER {PLAN_LIMITS.STARTER}, PRO {PLAN_LIMITS.PRO}, ENTERPRISE{" "}
              {PLAN_LIMITS.ENTERPRISE} students.
            </li>
            <li>Admissions blocked when school hits maxStudents.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
