import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { can, homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { TimetableEditor } from "./TimetableEditor";

export const dynamic = "force-dynamic";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: { armId?: string };
}) {
  const session = await requireSession();
  const allowed = ["ADMIN", "IT", "TEACHER", "PRINCIPAL"];
  if (!allowed.includes(session.role)) redirect(homeRouteForRole(session.role));

  const arms = await prisma.arm.findMany({
    include: {
      schoolClass: true,
      subjects: { include: { subject: true } },
    },
    orderBy: [{ schoolClass: { order: "asc" } }, { name: "asc" }],
  });

  const armId = searchParams.armId || arms[0]?.id;
  const selected = arms.find((a) => a.id === armId) || arms[0];

  const slots = selected
    ? await prisma.timetableSlot.findMany({
        where: { armId: selected.id },
        include: { armSubject: { include: { subject: true } } },
      })
    : [];

  const canEdit = can(session.role, "MANAGE_CLASSES");

  return (
    <PortalShell role={session.role} title="Timetable" subtitle="Weekly class periods (Mon–Fri)">
      {!selected ? (
        <p className="text-ink/50 text-sm">Create a class and arm under Classes first.</p>
      ) : (
        <TimetableEditor
          arms={arms.map((a) => ({
            id: a.id,
            label: `${a.schoolClass.name} ${a.name}`,
            subjects: a.subjects.map((s) => ({
              armSubjectId: s.id,
              name: s.subject.name,
            })),
          }))}
          selectedArmId={selected.id}
          slots={slots.map((s) => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            period: s.period,
            armSubjectId: s.armSubjectId,
            subjectName: s.armSubject.subject.name,
          }))}
          canEdit={canEdit}
        />
      )}
    </PortalShell>
  );
}
