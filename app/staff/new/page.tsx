import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { StaffForm } from "./StaffForm";

export default async function NewStaffPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_STAFF")) redirect("/staff");

  return (
    <PortalShell role={session.role} title="Add Staff" subtitle="Creates a staff profile and their portal login">
      <div className="max-w-xl">
        <StaffForm />
      </div>
    </PortalShell>
  );
}
