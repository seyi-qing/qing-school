import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { can, homeRouteForRole } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { SCHOOL } from "@/lib/school-config";
import { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";
import { redirect } from "next/navigation";
import { NoticeForm } from "./NoticeForm";

export const dynamic = "force-dynamic";

/** One-time DB cleanup of legacy demo branding strings. */
async function scrubLegacyBranding() {
  const legacy = await prisma.notice.findMany({
    where: {
      OR: [
        { title: { contains: "Force Schools" } },
        { body: { contains: "Force Schools" } },
      ],
    },
    take: 50,
  });
  for (const n of legacy) {
    await prisma.notice.update({
      where: { id: n.id },
      data: {
        title: n.title.replace(/Force Schools/gi, SCHOOL.name),
        body: n.body
          .replace(/Force Schools/gi, SCHOOL.name)
          .replace(/\bFS\b/g, SCHOOL.shortName),
      },
    });
  }
}

export default async function NoticesPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_NOTICES")) redirect(homeRouteForRole(session.role));

  await scrubLegacyBranding();

  const schoolId = await resolveSchoolId(session);
  const [notices, complaints] = await Promise.all([
    prisma.notice.findMany({
      where: { NOT: { audience: "COMPLAINT" }, ...schoolWhere(schoolId) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notice.findMany({
      where: { audience: "COMPLAINT", ...schoolWhere(schoolId) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <PortalShell role={session.role} title="Communication" subtitle="Notices and public complaints">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Post a notice</h2>
          <NoticeForm />
        </section>
        <section className="ledger-block lg:col-span-2">
          <h2 className="font-serif text-lg mb-3">Recent notices</h2>
          {notices.length === 0 ? (
            <EmptyState
              title="No notices yet"
              description="Post announcements for parents, staff, or the public website."
            />
          ) : (
            <ul className="space-y-3">
              {notices.map((n) => (
                <li key={n.id} className="border-b border-line pb-3 last:border-0">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {formatDate(n.createdAt)} · {n.audience}
                    {n.publishToWeb ? " · web" : ""}
                  </p>
                  <p className="text-sm text-ink/70 mt-1 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="ledger-block">
        <h2 className="font-serif text-lg mb-3">Public complaints / feedback</h2>
        {complaints.length === 0 ? (
          <EmptyState
            title="No complaints"
            description="Items submitted from the public site appear here."
          />
        ) : (
          <ul className="space-y-3">
            {complaints.map((n) => (
              <li key={n.id} className="border-b border-line pb-3 last:border-0">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-xs text-ink/50">{formatDate(n.createdAt)}</p>
                <p className="text-sm text-ink/70 mt-1 whitespace-pre-wrap">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalShell>
  );
}
