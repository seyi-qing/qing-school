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
      classesLed: { include: { schoolClass: true } },
      subjectsTaught: { include: { arm: { include: { schoolClass: true } }, subject: true } },
    },
  });

  if (!staff) {
    return (
      <PortalShell role={session.role} title="My Portal">
        <p className="text-ink/60">Your login isn't linked to a staff profile yet.</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell role={session.role} title={`Welcome, ${staff.firstName}`} subtitle={staff.designation ?? undefined}>
      <div className="grid md:grid-cols-2 gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Classes You Lead</h2>
          <ul className="text-sm space-y-1">
            {staff.classesLed.map((a) => (
              <li key={a.id}>{a.schoolClass.name} {a.name}</li>
            ))}
            {staff.classesLed.length === 0 && <li className="text-ink/50">None assigned.</li>}
          </ul>
        </section>
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Subjects You Teach</h2>
          <ul className="text-sm space-y-1">
            {staff.subjectsTaught.map((as) => (
              <li key={as.id}>{as.subject.name} — {as.arm.schoolClass.name} {as.arm.name}</li>
            ))}
            {staff.subjectsTaught.length === 0 && <li className="text-ink/50">None assigned.</li>}
          </ul>
        </section>
      </div>
      <div className="ledger-block mt-6">
        <h2 className="font-serif text-lg mb-3">Quick Actions</h2>
        <div className="flex gap-4 text-sm">
          <Link href="/attendance" className="text-navy underline">Take attendance</Link>
          <Link href="/exams" className="text-navy underline">Enter scores</Link>
          <Link href="/students" className="text-navy underline">View class list</Link>
        </div>
      </div>
    </PortalShell>
  );
}
