import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { formatNaira } from "@/lib/format";
import { redirect } from "next/navigation";
import { TransportClient } from "./TransportClient";

export const dynamic = "force-dynamic";

const ALLOWED = ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "ACCOUNTANT"];

export default async function TransportPage() {
  const session = await requireSession();
  if (!ALLOWED.includes(session.role)) redirect(homeRouteForRole(session.role));

  const [routes, students] = await Promise.all([
    prisma.transportRoute.findMany({
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, admissionNumber: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
    }),
  ]);

  return (
    <PortalShell role={session.role} title="Transport" subtitle="Bus routes and riders">
      <TransportClient
        routes={routes.map((r) => ({
          id: r.id,
          name: r.name,
          vehicle: r.vehicle,
          driverName: r.driverName,
          driverPhone: r.driverPhone,
          feeLabel: formatNaira(r.feeAmount),
          riders: r.enrollments.map((e) => ({
            id: e.id,
            studentName: `${e.student.firstName} ${e.student.lastName}`,
            admissionNumber: e.student.admissionNumber,
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
