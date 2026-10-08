import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { ProfileForm } from "@/components/ProfileForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      staff: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          designation: true,
          category: true,
        },
      },
    },
  });

  if (!user) {
    return (
      <PortalShell role={session.role} title="Profile" email={session.email}>
        <p className="text-sm text-brick">Account not found.</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      role={session.role}
      title="My profile"
      subtitle="Account details and security"
      email={session.email}
    >
      <div className="max-w-lg space-y-6">
        <section className="ledger-block space-y-2 text-sm">
          <p>
            <span className="text-ink/50 text-xs uppercase tracking-wide">Email</span>
            <br />
            <span className="break-all">{user.email}</span>
          </p>
          <p>
            <span className="text-ink/50 text-xs uppercase tracking-wide">Role</span>
            <br />
            {user.role.replace(/_/g, " ")}
          </p>
        </section>

        {user.staff ? (
          <ProfileForm
            firstName={user.staff.firstName}
            lastName={user.staff.lastName}
            phone={user.staff.phone || ""}
            designation={user.staff.designation || ""}
          />
        ) : (
          <p className="text-sm text-ink/60 ledger-block">
            No staff profile linked to this login. Email and role are managed by your school
            administrator.
          </p>
        )}

        <section className="ledger-block space-y-3">
          <h2 className="font-serif text-base">Security</h2>
          <Link
            href="/account/password"
            className="inline-block text-sm text-navy underline hover:text-gold"
          >
            Change password →
          </Link>
        </section>
      </div>
    </PortalShell>
  );
}
