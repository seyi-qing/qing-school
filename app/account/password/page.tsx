import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { ChangePasswordForm } from "@/app/settings/security/ChangePasswordForm";
import { passwordPolicyHint, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { getSession } from "@/lib/auth";
import { homeRouteForRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AccountPasswordPage() {
  const session = await requireSession();
  const full = await getSession();
  const forced = Boolean(full?.mustChangePassword);

  return (
    <PortalShell
      role={session.role}
      title={forced ? "Set a new password" : "Change password"}
      subtitle={
        forced
          ? "Your account requires a new password before you can continue."
          : "Update the password for your account"
      }
    >
      <div className="max-w-lg space-y-6">
        {forced && (
          <p className="text-sm border border-gold/40 bg-gold/10 px-3 py-2 text-ink/80">
            You signed in with a temporary or reset password. Choose a strong password you control,
            then you will be taken to your portal.
          </p>
        )}
        <section className="ledger-block">
          <ChangePasswordForm
            forceMode={forced}
            afterSuccessPath={homeRouteForRole(session.role)}
          />
        </section>
        <section className="text-sm text-ink/60 space-y-1">
          <p className="font-medium text-ink/80">Policy</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Minimum length: {PASSWORD_MIN_LENGTH}</li>
            <li>{passwordPolicyHint()}</li>
          </ul>
        </section>
      </div>
    </PortalShell>
  );
}
