import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { formatNaira } from "@/lib/format";

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
      subtitle={`${staff.length} staff on record`}
      actions={
        <Link href="/staff/new" className="bg-navy text-paper text-sm px-4 py-2 hover:bg-navy-light">
          + Add Staff
        </Link>
      }
    >
      <div className="ledger-block !p-0 overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th>Staff ID</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Category</th>
              <th>Login role</th>
              <th>Monthly salary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.staffId}</td>
                <td>
                  {s.lastName}, {s.firstName}
                  <div className="text-xs text-ink/50">{s.user.email}</div>
                </td>
                <td>{s.designation ?? "-"}</td>
                <td>{s.category === "TEACHING" ? "Teaching" : "Non-teaching"}</td>
                <td>{s.user.role}</td>
                <td>{s.monthlySalary ? formatNaira(s.monthlySalary) : "-"}</td>
                <td>
                  <span className={`status-pill ${s.isActive ? "text-sage" : "text-brick"}`}>
                    {s.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
