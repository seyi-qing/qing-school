import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { homeRouteForRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "TEACHER"];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await requireSession();
  if (!ALLOWED_ROLES.includes(session.role)) redirect(homeRouteForRole(session.role));
  const q = searchParams.q?.trim();

  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
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
  });

  const canAdmit = can(session.role, "MANAGE_STUDENTS");

  return (
    <PortalShell
      role={session.role}
      title="Students"
      subtitle={`${students.length} active student${students.length === 1 ? "" : "s"} shown`}
      actions={
        canAdmit ? (
          <Link href="/students/new" className="bg-navy text-paper text-sm px-4 py-2 hover:bg-navy-light">
            + Admit Student
          </Link>
        ) : undefined
      }
    >
      <form className="mb-4 flex gap-2" method="GET">
        <input type="text" name="q" defaultValue={q} placeholder="Search by name or admission number..." className="border border-line px-3 py-2 text-sm w-72 bg-white" />
        <button className="border border-navy text-navy text-sm px-4 hover:bg-navy hover:text-paper">Search</button>
      </form>

      <div className="ledger-block !p-0 overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th>Admission No.</th>
              <th>Name</th>
              <th>Class / Arm</th>
              <th>Gender</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.admissionNumber}</td>
                <td>{s.lastName}, {s.firstName} {s.otherNames ?? ""}</td>
                <td>{s.arm ? `${s.arm.schoolClass.name} ${s.arm.name}` : <span className="text-ink/40">Unassigned</span>}</td>
                <td>{s.gender ?? "-"}</td>
                <td>
                  <Link href={`/students/${s.id}`} className="text-navy underline text-sm hover:text-gold">View</Link>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={5} className="text-center text-ink/50 py-8">No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
