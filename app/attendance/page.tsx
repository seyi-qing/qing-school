import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { AttendanceForm } from "./AttendanceForm";
import { redirect } from "next/navigation";
import { homeRouteForRole } from "@/lib/permissions";

const ALLOWED_ROLES = ["ADMIN", "TEACHER", "IT"];

export default async function AttendancePage({ searchParams }: { searchParams: { armId?: string } }) {
  const session = await requireSession();
  if (!ALLOWED_ROLES.includes(session.role)) redirect(homeRouteForRole(session.role));

  const arms = await prisma.arm.findMany({
    include: { schoolClass: true },
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

  return (
    <PortalShell role={session.role} title="Attendance" subtitle="Mark today's attendance for a class">
      <form method="GET" className="mb-4">
        <select name="armId" defaultValue={selectedArmId} className="border border-line px-3 py-2 text-sm bg-white">
          {arms.map((a) => (
            <option key={a.id} value={a.id}>
              {a.schoolClass.name} {a.name}
            </option>
          ))}
        </select>
      </form>

      {selectedArmId ? (
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
