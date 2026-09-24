import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { NoticeForm } from "./NoticeForm";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const session = await requireSession();
  const notices = await prisma.notice.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  const canManage = can(session.role, "MANAGE_NOTICES");

  return (
    <PortalShell role={session.role} title="Communication" subtitle="Notice board and announcements">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {notices.map((n) => (
            <article key={n.id} className="ledger-block">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-serif text-lg">{n.title}</h3>
                <span className="status-pill text-ink/50">{n.audience}</span>
              </div>
              <p className="text-sm text-ink/80">{n.body}</p>
              <p className="text-xs text-ink/40 mt-2">
                {formatDate(n.createdAt)} {n.publishToWeb && "· Published on website"}
              </p>
            </article>
          ))}
          {notices.length === 0 && <p className="text-ink/50">No notices yet.</p>}
        </div>

        {canManage && (
          <div>
            <NoticeForm />
          </div>
        )}
      </div>
    </PortalShell>
  );
}
