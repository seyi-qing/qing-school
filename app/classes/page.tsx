import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { ClassManager } from "./ClassManager";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { homeRouteForRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_CLASSES")) redirect(homeRouteForRole(session.role));

  const [classes, subjects] = await Promise.all([
    prisma.schoolClass.findMany({
      include: { arms: { include: { students: { where: { status: "ACTIVE" } } } } },
      orderBy: { order: "asc" },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <PortalShell role={session.role} title="Classes & Subjects" subtitle="Manage class structure and promote students">
      <ClassManager
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          arms: c.arms.map((a) => ({ id: a.id, name: a.name, studentCount: a.students.length })),
        }))}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
      />
    </PortalShell>
  );
}
