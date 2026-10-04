import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { StaffTable } from "./StaffTable";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await requireSession();
  const staff = await prisma.staff.findMany({
    include: { user: { select: { email: true, role: true, isActive: true } } },
    orderBy: [{ lastName: "asc" }],
  });

  return (
    <PortalShell
      role={session.role}
      title="Staff"
      subtitle={`${staff.length} staff on record · edit role, status, salary, reset password`}
      actions={
        <Link href="/staff/new" className="bg-navy text-paper text-sm px-4 py-2 hover:bg-navy-light">
          + Add Staff
        </Link>
      }
    >
      <StaffTable
        rows={staff.map((s) => ({
          id: s.id,
          staffId: s.staffId,
          firstName: s.firstName,
          lastName: s.lastName,
          designation: s.designation,
          category: s.category,
          phone: s.phone,
          monthlySalary: s.monthlySalary,
          isActive: s.isActive && s.user.isActive,
          email: s.user.email,
          role: s.user.role,
        }))}
      />
    </PortalShell>
  );
}
