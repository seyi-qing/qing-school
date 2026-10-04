import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ROLES = ["ADMIN", "IT", "PRINCIPAL", "ACCOUNTANT", "SECRETARY", "TEACHER", "STUDENT", "PARENT"] as const;

export default async function PermissionsPage() {
  const session = await requireSession();
  if (!["ADMIN", "IT"].includes(session.role)) {
    redirect(homeRouteForRole(session.role));
  }

  const keys = Object.keys(PERMISSIONS) as Permission[];

  return (
    <PortalShell
      role={session.role}
      title="Staff permissions audit"
      subtitle="What each role can do — source of truth is lib/permissions.ts"
      actions={
        <Link href="/settings" className="text-sm border border-navy text-navy px-3 py-1.5">
          ← Settings
        </Link>
      }
    >
      <div className="ledger-block !p-0 overflow-x-auto">
        <table className="ledger text-xs">
          <thead>
            <tr>
              <th className="text-left sticky left-0 bg-paper z-10">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="text-center px-2">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((perm) => (
              <tr key={perm}>
                <td className="font-mono sticky left-0 bg-paper z-10 whitespace-nowrap">{perm}</td>
                {ROLES.map((r) => {
                  const allowed = (PERMISSIONS[perm] as readonly string[]).includes(r);
                  return (
                    <td key={r} className={`text-center ${allowed ? "text-sage font-medium" : "text-ink/25"}`}>
                      {allowed ? "✓" : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink/50 mt-3">
        Changing roles for a staff member is done under <Link href="/staff" className="underline">Staff → Edit</Link>.
        Code changes to this matrix require a developer deploy.
      </p>
    </PortalShell>
  );
}
