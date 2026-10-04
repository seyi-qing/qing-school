import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const session = await requireSession();
  if (!["ADMIN", "IT"].includes(session.role)) {
    redirect(homeRouteForRole(session.role));
  }

  const termiiKey = !!process.env.TERMII_API_KEY;
  const sender = process.env.TERMII_SENDER_ID || "KMS";
  const sessionSecretOk = !!(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16);
  const databaseUrl = !!process.env.DATABASE_URL;
  const allowSeed = process.env.ALLOW_SETUP_SEED === "true";

  const recentSms = await prisma.messageLog.count({
    where: { channel: "SMS", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  return (
    <PortalShell
      role={session.role}
      title="Operations"
      subtitle="SMS production keys, backup, and production hygiene"
      actions={
        <Link href="/settings" className="text-sm border border-navy text-navy px-3 py-1.5">
          Back to Settings
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="ledger-block space-y-3 text-sm">
          <h2 className="font-serif text-lg">SMS (Termii)</h2>
          <ul className="space-y-2">
            <li className="flex justify-between border-b border-line py-1">
              <span>TERMII_API_KEY</span>
              <span className={termiiKey ? "text-sage" : "text-brick"}>
                {termiiKey ? "Set" : "Missing (mock mode)"}
              </span>
            </li>
            <li className="flex justify-between border-b border-line py-1">
              <span>Sender ID</span>
              <span className="font-mono">{sender}</span>
            </li>
            <li className="flex justify-between border-b border-line py-1">
              <span>SMS logs (7 days)</span>
              <span>{recentSms}</span>
            </li>
          </ul>
          <div className="text-xs text-ink/60 space-y-1">
            <p className="font-medium text-ink">
              Production setup (Vercel Settings / Environment Variables):
            </p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Create a Termii account and approve sender ID (e.g. KMS).</li>
              <li>Set TERMII_API_KEY to your API key.</li>
              <li>Set TERMII_SENDER_ID to the approved sender.</li>
              <li>Redeploy. Fee reminders and notices will send live SMS.</li>
            </ol>
            {!termiiKey && (
              <p className="text-brick mt-2">
                Without the key, SMS is logged as sent but not delivered to phones.
              </p>
            )}
          </div>
        </section>

        <section className="ledger-block space-y-3 text-sm">
          <h2 className="font-serif text-lg">Backup and database</h2>
          <ul className="space-y-2">
            <li className="flex justify-between border-b border-line py-1">
              <span>DATABASE_URL</span>
              <span className={databaseUrl ? "text-sage" : "text-brick"}>
                {databaseUrl ? "Configured" : "Missing"}
              </span>
            </li>
            <li className="flex justify-between border-b border-line py-1">
              <span>SESSION_SECRET</span>
              <span className={sessionSecretOk ? "text-sage" : "text-brick"}>
                {sessionSecretOk ? "OK" : "Weak / missing"}
              </span>
            </li>
            <li className="flex justify-between border-b border-line py-1">
              <span>ALLOW_SETUP_SEED</span>
              <span className={allowSeed ? "text-brick" : "text-sage"}>
                {allowSeed ? "true (lock after migrate)" : "false / off"}
              </span>
            </li>
          </ul>
          <div className="text-xs text-ink/60 space-y-2">
            <p className="font-medium text-ink">Backup story (product requirement):</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>
                <strong>Primary:</strong> Use your Postgres host automated backups (Neon / Supabase
                / Railway point-in-time recovery). Enable daily snapshots minimum.
              </li>
              <li>
                <strong>Weekly export:</strong> From provider dashboard export a logical dump, or
                use pg_dump into encrypted off-site storage.
              </li>
              <li>
                <strong>App data:</strong> Report logos and uploads live on Vercel Blob / storage -
                keep the same retention policy.
              </li>
              <li>
                <strong>Before major changes:</strong> Snapshot DB, then deploy. Keep
                ALLOW_SETUP_SEED=false in production.
              </li>
              <li>
                <strong>Restore drill:</strong> Once a term, restore a backup to a staging branch
                and verify login + student counts.
              </li>
            </ol>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
