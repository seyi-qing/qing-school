import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { HostelClient } from "./HostelClient";

export const dynamic = "force-dynamic";

const ALLOWED = ["ADMIN", "IT", "SECRETARY", "PRINCIPAL"];

export default async function HostelPage() {
  const session = await requireSession();
  if (!ALLOWED.includes(session.role)) redirect(homeRouteForRole(session.role));

  const [rooms, students] = await Promise.all([
    prisma.hostelRoom.findMany({
      include: {
        allocations: {
          where: { status: "ACTIVE" },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, admissionNumber: true },
            },
          },
        },
      },
      orderBy: [{ block: "asc" }, { name: "asc" }],
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
    }),
  ]);

  return (
    <PortalShell role={session.role} title="Hostel" subtitle="Rooms and bed allocation">
      <HostelClient
        rooms={rooms.map((r) => ({
          id: r.id,
          name: r.name,
          block: r.block,
          capacity: r.capacity,
          gender: r.gender,
          occupied: r.allocations.length,
          allocations: r.allocations.map((a) => ({
            id: a.id,
            bedLabel: a.bedLabel,
            studentName: `${a.student.firstName} ${a.student.lastName}`,
            admissionNumber: a.student.admissionNumber,
          })),
        }))}
        students={students.map((s) => ({
          id: s.id,
          label: `${s.lastName}, ${s.firstName} (${s.admissionNumber})`,
        }))}
      />
    </PortalShell>
  );
}
