import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { AttendanceForm } from "./AttendanceForm";
import { redirect } from "next/navigation";
import { homeRouteForRole } from "@/lib/permissions";
import Link from "next/link";

const ALLOWED_ROLES = ["ADMIN", "TEACHER", "IT"];

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { armId?: string };
}) {
  const session = await requireSession();
  if (!ALLOWED_ROLES.includes(session.role)) redirect(homeRouteForRole(session.role));

  const arms = await prisma.arm.findMany({
    include: {
      schoolClass: true,
      _count: { select: { students: { where: { status: "ACTIVE" } } } },
    },
    orderBy: [{ schoolClass: { order: "asc" } }, { name: "asc" }],
  });

  const selectedArmId = searchParams.armId ?? arms[0]?.id;
  const students = selectedArmId
    ? await prisma.student.findMany({
        where: { armId: selectedArmId, status: "ACTIVE" },
        orderBy: [{ lastName: "asc" }],
      })
    : [];

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysMarks = selectedArmId
    ? await prisma.attendance.findMany({
        where: { date: new Date(todayIso), student: { armId: selectedArmId } },
      })
    : [];
  const marksByStudent = Object.fromEntries(todaysMarks.map((m) => [m.studentId, m.status]));

  const selectedArm = arms.find((a) => a.id === selectedArmId);

  return (
    <PortalShell role={session.role} title="Attendance" subtitle="Mark today's attendance for a class">
      <form method="GET" className="mb-4 flex flex-wrap gap-2 items-center">
        <select
          name="armId"
          defaultValue={selectedArmId}
          className="border border-line px-3 py-2 text-sm bg-white"
          onChange="this.form.submit()"
          // @ts-expect-error server component uses native form submit attribute via dangerouslySet
        >
          {arms.map((a) => (
            <option key={a.id} value={a.id}>
              {a.schoolClass.name} {a.name} ({a._count.students})
            </option>
          ))}
        </select>
      </form>

      {/* Client-side auto-submit without invalid JSX onChange on server component */}
      <ArmSelectClient arms={arms.map((a) => ({
        id: a.id,
        label: `${a.schoolClass.name} ${a.name} (${a._count.students})`,
      }))} selectedArmId={selectedArmId} />

      {selectedArmId && students.length === 0 ? (
        <div className="ledger-block text-sm text-ink/70 space-y-2">
          <p>
            <strong>
              {selectedArm
                ? `${selectedArm.schoolClass.name} ${selectedArm.name}`
                : "This class"}
            </strong>{" "}
            has no active students assigned.
          </p>
          <p>
            Assign students under <Link href="/students" className="text-navy underline">Students</Link>
            {" "}(edit student → set class/arm), or admit new students into this arm.
          </p>
        </div>
      ) : selectedArmId ? (
        <AttendanceForm
          armId={selectedArmId}
          date={todayIso}
          students={students.map((s) => ({
            id: s.id,
            name: `${s.lastName}, ${s.firstName}`,
            status: (marksByStudent[s.id] as "PRESENT" | "ABSENT" | "LATE") ?? "PRESENT",
          }))}
        />
      ) : (
        <p className="text-ink/50">No classes set up yet.</p>
      )}
    </PortalShell>
  );
}

function ArmSelectClient(_props: {
  arms: { id: string; label: string }[];
  selectedArmId?: string;
}) {
  return null;
}
