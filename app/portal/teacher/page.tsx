import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeacherPortalPage() {
  const session = await requireSession();
  if (session.role !== "TEACHER") redirect("/dashboard");

  const staff = await prisma.staff.findUnique({
    where: { userId: session.userId },
    include: {
      classesLed: { include: { schoolClass: true, students: { where: { status: "ACTIVE" } } } },
      subjectsTaught: {
        include: { arm: { include: { schoolClass: true } }, subject: true },
      },
      leaveRequests: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  if (!staff) {
    return (
      <PortalShell role={session.role} title="Teacher Portal">
        <p className="text-ink/60 text-sm">
          Your login is not linked to a staff profile yet. Ask Admin/IT to create your staff record
          and link this email.
        </p>
      </PortalShell>
    );
  }

  const studentCount = staff.classesLed.reduce((n, a) => n + a.students.length, 0);

  return (
    <PortalShell
      role={session.role}
      title={`Welcome, ${staff.firstName}`}
      subtitle={staff.designation ?? "Teacher"}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Classes led</p>
          <p className="ledger-number text-2xl mt-1">{staff.classesLed.length}</p>
        </div>
        <div className="ledger-block">
          <p className="text-xs uppercase text-ink/50">Subjects</p>
          <p className="ledger-number text-2xl mt-1">{staff.subjectsTaught.length}</p>
        </div>
        <div className="ledger-block col-span-2 sm:col-span-1">
          <p className="text-xs uppercase text-ink/50">Students in your classes</p>
          <p className="ledger-number text-2xl mt-1">{studentCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Classes you lead</h2>
          <ul className="text-sm space-y-2">
            {staff.classesLed.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-line pb-2">
                <span>
                  {a.schoolClass.name} {a.name}
                </span>
                <span className="text-ink/50">{a.students.length} students</span>
              </li>
            ))}
            {staff.classesLed.length === 0 && (
              <li className="text-ink/50">None assigned as class teacher yet.</li>
            )}
          </ul>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Subjects you teach</h2>
          <ul className="text-sm space-y-2">
            {staff.subjectsTaught.map((as) => (
              <li key={as.id} className="border-b border-line pb-2">
                {as.subject.name}
                <span className="text-ink/50">
                  {" "}
                  — {as.arm.schoolClass.name} {as.arm.name}
                </span>
              </li>
            ))}
            {staff.subjectsTaught.length === 0 && (
              <li className="text-ink/50">No subject assignments yet.</li>
            )}
          </ul>
        </section>
      </div>

      <section className="ledger-block mb-6">
        <h2 className="font-serif text-lg mb-3">Quick actions</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/attendance" className="border border-navy text-navy px-3 py-2 hover:bg-navy hover:text-paper">
            Take attendance
          </Link>
          <Link href="/exams" className="border border-navy text-navy px-3 py-2 hover:bg-navy hover:text-paper">
            Enter scores
          </Link>
          <Link href="/students" className="border border-navy text-navy px-3 py-2 hover:bg-navy hover:text-paper">
            Class list
          </Link>
          <Link href="/timetable" className="border border-navy text-navy px-3 py-2 hover:bg-navy hover:text-paper">
            Timetable
          </Link>
          <Link href="/leave" className="border border-navy text-navy px-3 py-2 hover:bg-navy hover:text-paper">
            Request leave
          </Link>
        </div>
      </section>

      {staff.leaveRequests.length > 0 && (
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Recent leave requests</h2>
          <ul className="text-sm space-y-2">
            {staff.leaveRequests.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 border-b border-line pb-2">
                <span className="text-ink/70">
                  {r.startDate.toLocaleDateString()} – {r.endDate.toLocaleDateString()}
                </span>
                <span className="status-pill text-xs">{r.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PortalShell>
  );
}
