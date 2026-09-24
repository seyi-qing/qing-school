import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { ScoreEntryGrid } from "./ScoreEntryGrid";
import { redirect } from "next/navigation";
import { homeRouteForRole } from "@/lib/permissions";

const ALLOWED_ROLES = ["ADMIN", "TEACHER", "PRINCIPAL"];

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: { armSubjectId?: string };
}) {
  const session = await requireSession();
  if (!ALLOWED_ROLES.includes(session.role)) redirect(homeRouteForRole(session.role));

  const term = await prisma.term.findFirst({ where: { isCurrent: true } });
  const armSubjects = await prisma.armSubject.findMany({
    include: { arm: { include: { schoolClass: true } }, subject: true },
    orderBy: [{ arm: { schoolClass: { order: "asc" } } }],
  });

  const selected = searchParams.armSubjectId
    ? armSubjects.find((a) => a.id === searchParams.armSubjectId)
    : armSubjects[0];

  const students = selected
    ? await prisma.student.findMany({
        where: { armId: selected.armId, status: "ACTIVE" },
        orderBy: [{ lastName: "asc" }],
      })
    : [];

  const existingScores =
    selected && term
      ? await prisma.score.findMany({ where: { armSubjectId: selected.id, termId: term.id } })
      : [];
  const scoreByStudent = Object.fromEntries(existingScores.map((s) => [s.studentId, s]));

  return (
    <PortalShell role={session.role} title="Exams & Results" subtitle={term ? `Entering scores for ${term.name}` : "No current term set"}>
      <form method="GET" className="mb-4">
        <select name="armSubjectId" defaultValue={selected?.id} className="border border-line px-3 py-2 text-sm bg-white">
          {armSubjects.map((a) => (
            <option key={a.id} value={a.id}>
              {a.arm.schoolClass.name} {a.arm.name} — {a.subject.name}
            </option>
          ))}
        </select>
      </form>

      {selected && term ? (
        <ScoreEntryGrid
          armSubjectId={selected.id}
          termId={term.id}
          students={students.map((s) => ({
            id: s.id,
            name: `${s.lastName}, ${s.firstName}`,
            ca1: scoreByStudent[s.id]?.ca1 ?? 0,
            ca2: scoreByStudent[s.id]?.ca2 ?? 0,
            exam: scoreByStudent[s.id]?.exam ?? 0,
          }))}
        />
      ) : (
        <p className="text-ink/50">
          {term ? "No subjects assigned to classes yet." : "Set a current term in Admin Settings first."}
        </p>
      )}
    </PortalShell>
  );
}
