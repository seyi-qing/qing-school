import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const RouteSchema = z.object({
  name: z.string().min(1).max(120),
  vehicle: z.string().max(80).optional(),
  driverName: z.string().max(80).optional(),
  driverPhone: z.string().max(30).optional(),
  feeAmount: z.coerce.number().min(0).default(0),
});

const EnrollSchema = z.object({
  routeId: z.string(),
  studentId: z.string(),
});

function canManage(role: string) {
  return ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "ACCOUNTANT"].includes(role);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const routes = await prisma.transportRoute.findMany({
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ routes });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  if (body?.action === "unenroll" && body?.enrollmentId) {
    const en = await prisma.transportEnrollment.update({
      where: { id: body.enrollmentId },
      data: { status: "ENDED", endDate: new Date() },
    });
    await logAudit({
      userId: session.userId,
      action: "UNENROLL_TRANSPORT",
      entity: "TransportEnrollment",
      entityId: en.id,
    });
    return NextResponse.json({ ok: true });
  }

  if (body?.routeId && body?.studentId) {
    const parsed = EnrollSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid enrollment" }, { status: 400 });

    const existing = await prisma.transportEnrollment.findFirst({
      where: { studentId: parsed.data.studentId, status: "ACTIVE" },
    });
    if (existing) {
      return NextResponse.json({ error: "Student already on a route" }, { status: 400 });
    }

    const en = await prisma.transportEnrollment.create({
      data: {
        routeId: parsed.data.routeId,
        studentId: parsed.data.studentId,
      },
    });

    await logAudit({
      userId: session.userId,
      action: "ENROLL_TRANSPORT",
      entity: "TransportEnrollment",
      entityId: en.id,
    });
    return NextResponse.json({ enrollment: en }, { status: 201 });
  }

  const parsed = RouteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid route data" }, { status: 400 });

  const route = await prisma.transportRoute.create({
    data: {
      name: parsed.data.name,
      vehicle: parsed.data.vehicle || null,
      driverName: parsed.data.driverName || null,
      driverPhone: parsed.data.driverPhone || null,
      feeAmount: parsed.data.feeAmount,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE_TRANSPORT_ROUTE",
    entity: "TransportRoute",
    entityId: route.id,
  });

  return NextResponse.json({ route }, { status: 201 });
}
