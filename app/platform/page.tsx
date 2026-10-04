import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ensureDefaultSchool, backfillSchoolIds } from "@/lib/tenant";

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

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-navy text-paper px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-paper/50">SaaS control plane</p>
          <h1 className="font-serif text-xl">Platform · Schools</h1>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/onboarding" className="border border-paper/40 px-3 py-1.5 hover:border-gold">Onboard school</Link>
          <Link href="/dashboard" className="border border-paper/40 px-3 py-1.5 hover:border-gold">School dashboard</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="ledger-block"><p className="text-xs text-ink/50 uppercase">Schools</p><p className="font-serif text-2xl mt-1">{schools.length}</p></div>
          <div className="ledger-block"><p className="text-xs text-ink/50 uppercase">Active</p><p className="font-serif text-2xl mt-1">{schools.filter((s) => s.isActive).length}</p></div>
          <div className="ledger-block"><p className="text-xs text-ink/50 uppercase">Students</p><p className="font-serif text-2xl mt-1">{schools.reduce((n, s) => n + s._count.students, 0)}</p></div>
          <div className="ledger-block"><p className="text-xs text-ink/50 uppercase">Users</p><p className="font-serif text-2xl mt-1">{schools.reduce((n, s) => n + s._count.users, 0)}</p></div>
        </div>
        <section className="ledger-block !p-0 overflow-x-auto">
          <div className="p-4 pb-0"><h2 className="font-serif text-lg">Tenants</h2></div>
          <table className="ledger mt-3 text-sm">
            <thead><tr><th>School</th><th>Slug</th><th>Plan</th><th>Users</th><th>Students</th><th>Status</th></tr></thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id}>
                  <td><span className="font-medium">{s.name}</span><span className="block text-xs text-ink/40">{s.shortName}</span></td>
                  <td className="font-mono text-xs">{s.slug}</td>
                  <td>{s.plan}</td>
                  <td>{s._count.users}</td>
                  <td>{s._count.students}</td>
                  <td className={s.isActive ? "text-sage" : "text-brick"}>{s.isActive ? "Active" : "Suspended"}{s.isDemo ? " · Demo" : ""}</td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr><td colSpan={6} className="text-center text-ink/50 py-8">No schools yet. Use Onboard school.</td></tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="ledger-block text-sm space-y-2">
          <h2 className="font-serif text-lg">Selling this product</h2>
          <ul className="list-disc pl-5 space-y-1 text-ink/70">
            <li>Each school is a tenant (schoolId on users, students, staff, notices, CMS, sessions).</li>
            <li>White-label: name, shortName, colors, logoUrl, contact on School.</li>
            <li>Plans STARTER / PRO / ENTERPRISE set maxStudents.</li>
            <li>Subdomain routing: host subdomain → School.slug (lib/tenant.ts).</li>
            <li>Billing: wire Paystack subscriptions to School.id next; plans are modeled now.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
