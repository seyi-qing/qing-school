import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { BulkPinGenerator } from "@/components/BulkPinGenerator";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { TermSwitcher } from "./TermSwitcher";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SYSTEM_SETTINGS")) redirect("/dashboard");

  const [sessions, gradeBands, auditLog] = await Promise.all([
    prisma.session.findMany({ include: { terms: true }, orderBy: { name: "desc" } }),
    prisma.gradeBand.findMany({ orderBy: { minScore: "desc" } }),
    can(session.role, "VIEW_AUDIT_TRAIL")
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { user: { select: { email: true } } },
        })
      : Promise.resolve([]),
  ]);

  const flatTerms = sessions.flatMap((s) =>
    s.terms.map((t) => ({
      id: t.id,
      name: t.name,
      sessionName: s.name,
      isCurrent: t.isCurrent,
    }))
  );

  return (
    <PortalShell
      role={session.role}
      title="Admin Settings"
      subtitle="Session/term, grading, result PINs, audit trail"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Session & Term Manager</h2>
          <TermSwitcher
            sessions={sessions.map((s) => ({
              id: s.id,
              name: s.name,
              terms: s.terms.map((t) => ({ id: t.id, name: t.name, isCurrent: t.isCurrent })),
            }))}
          />
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Result Checker PINs</h2>
          <BulkPinGenerator terms={flatTerms} />
        </section>

        <section className="ledger-block md:col-span-2">
          <h2 className="font-serif text-lg mb-3">Grading System</h2>
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Range</th>
                  <th>Grade</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {gradeBands.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.minScore}–{b.maxScore}
                    </td>
                    <td>{b.grade}</td>
                    <td>{b.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink/40 mt-2">
            Default bands follow WAEC-style A1–F9. Change rows in the database when the school uses
            a different scale.
          </p>
        </section>
      </div>

      {can(session.role, "VIEW_AUDIT_TRAIL") && (
        <section className="ledger-block !p-0 overflow-x-auto">
          <div className="p-4">
            <h2 className="font-serif text-lg">Audit Trail</h2>
          </div>
          <table className="ledger">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((log) => (
                <tr key={log.id}>
                  <td className="text-xs">{formatDate(log.createdAt)}</td>
                  <td className="text-xs">{log.user?.email ?? "System"}</td>
                  <td>{log.action}</td>
                  <td>
                    {log.entity}
                    {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </PortalShell>
  );
}
