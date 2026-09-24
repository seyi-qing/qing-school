import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { ApproveStudentButton } from "@/components/ApproveStudentButton";
import { can, homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "TEACHER"];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const session = await requireSession();
  if (!ALLOWED_ROLES.includes(session.role)) redirect(homeRouteForRole(session.role));

  const q = searchParams.q?.trim();
  const statusFilter = searchParams.status || "ACTIVE";
  const canAdmit = can(session.role, "MANAGE_STUDENTS");

  const [students, appliedCount] = await Promise.all([
    prisma.student.findMany({
      where: {
        status: statusFilter,
        ...(q
          ? {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { admissionNumber: { contains: q } },
              ],
            }
          : {}),
      },
      include: { arm: { include: { schoolClass: true } } },
      orderBy: [{ lastName: "asc" }],
      take: 200,
    }),
    prisma.student.count({ where: { status: "APPLIED" } }),
  ]);

  const tabs = [
    { key: "ACTIVE", label: "Active" },
    { key: "APPLIED", label: `Applications${appliedCount ? ` (${appliedCount})` : ""}` },
    { key: "WITHDRAWN", label: "Withdrawn" },
    { key: "GRADUATED", label: "Graduated" },
  ];

  return (
    <PortalShell
      role={session.role}
      title="Students"
      subtitle={`${students.length} shown`}
      actions={
        canAdmit ? (
          <Link
            href="/students/new"
            className="bg-navy text-paper text-sm px-4 py-2 hover:bg-navy-light"
          >
            + Admit Student
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/students?status=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3 py-1.5 border ${
              statusFilter === t.key
                ? "border-navy bg-navy text-paper"
                : "border-line text-ink/70 hover:border-navy"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2" method="GET">
        <input type="hidden" name="status" value={statusFilter} />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name or admission number..."
          className="border border-line px-3 py-2 text-sm w-full sm:w-72 bg-white"
        />
        <button className="border border-navy text-navy text-sm px-4 hover:bg-navy hover:text-paper">
          Search
        </button>
      </form>

      <div className="ledger-block !p-0 overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th>Admission No.</th>
              <th>Name</th>
              <th>Class / Arm</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.admissionNumber}</td>
                <td>
                  {s.lastName}, {s.firstName} {s.otherNames ?? ""}
                </td>
                <td>
                  {s.arm ? (
                    `${s.arm.schoolClass.name} ${s.arm.name}`
                  ) : (
                    <span className="text-ink/40">Unassigned</span>
                  )}
                </td>
                <td>
                  <span className="status-pill text-xs">{s.status}</span>
                </td>
                <td className="space-x-2 whitespace-nowrap">
                  <Link
                    href={`/students/${s.id}`}
                    className="text-navy underline text-sm hover:text-gold"
                  >
                    View
                  </Link>
                  {s.status === "APPLIED" && canAdmit && (
                    <ApproveStudentButton studentId={s.id} />
                  )}
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink/50 py-8">
                  No students in this list.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
