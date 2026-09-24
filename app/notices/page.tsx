import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { can, homeRouteForRole } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { redirect } from "next/navigation";
import { NoticeForm } from "./NoticeForm";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_NOTICES")) redirect(homeRouteForRole(session.role));

  const [notices, complaints] = await Promise.all([
    prisma.notice.findMany({
      where: { NOT: { audience: "COMPLAINT" } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notice.findMany({
      where: { audience: "COMPLAINT" },
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
        <section className="ledger-block !p-0 overflow-x-auto lg:col-span-2">
          <div className="p-4 pb-0">
            <h2 className="font-serif text-lg">Recent notices</h2>
          </div>
          <table className="ledger mt-3">
            <thead>
              <tr>
                <th>When</th>
                <th>Title</th>
                <th>Audience</th>
                <th>Web</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((n) => (
                <tr key={n.id}>
                  <td className="text-xs">{formatDate(n.createdAt)}</td>
                  <td>
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-ink/50 line-clamp-2">{n.body}</div>
                  </td>
                  <td>{n.audience}</td>
                  <td>{n.publishToWeb ? "Yes" : "No"}</td>
                </tr>
              ))}
              {notices.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-ink/50 py-6">
                    No notices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <section className="ledger-block !p-0 overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-serif text-lg">Complaint inbox</h2>
          <p className="text-xs text-ink/50">From public form /complaints</p>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>When</th>
              <th>Subject / message</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id}>
                <td className="text-xs whitespace-nowrap">{formatDate(c.createdAt)}</td>
                <td>
                  <div className="font-medium">{c.title}</div>
                  <pre className="text-xs text-ink/60 whitespace-pre-wrap font-sans mt-1">{c.body}</pre>
                </td>
              </tr>
            ))}
            {complaints.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center text-ink/50 py-6">
                  No complaints yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </PortalShell>
  );
}
