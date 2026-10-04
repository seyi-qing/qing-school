import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const RouteSchema = z.object({
  name: z.string().min(1).max(120),
  vehicle: z.string().max(80).optional().nullable(),
  driverName: z.string().max(80).optional().nullable(),
  driverPhone: z.string().max(30).optional().nullable(),
  feeAmount: z.coerce.number().min(0).default(0),
});

const UpdateRouteSchema = RouteSchema.extend({
  id: z.string().min(1),
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

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateRouteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid route data" },
      { status: 400 }
    );
  }

  const existing = await prisma.transportRoute.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return NextResponse.json({ error: "Route not found" }, { status: 404 });

  const route = await prisma.transportRoute.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name.trim(),
      vehicle: parsed.data.vehicle?.trim() || null,
      driverName: parsed.data.driverName?.trim() || null,
      driverPhone: parsed.data.driverPhone?.trim() || null,
      feeAmount: parsed.data.feeAmount,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "UPDATE_TRANSPORT_ROUTE",
    entity: "TransportRoute",
    entityId: route.id,
    details: {
      name: route.name,
      driverName: route.driverName,
      driverPhone: route.driverPhone,
      feeAmount: route.feeAmount,
    },
  });

  return NextResponse.json({ route });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "Route id required" }, { status: 400 });

  const activeRiders = await prisma.transportEnrollment.count({
    where: { routeId: id, status: "ACTIVE" },
  });
  if (activeRiders > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${activeRiders} active rider(s). Remove them first.`,
      },
      { status: 409 }
    );
  }

  await prisma.transportRoute.delete({ where: { id } });
  await logAudit({
    userId: session.userId,
    action: "DELETE_TRANSPORT_ROUTE",
    entity: "TransportRoute",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  if (body?.action === "createFeeInvoice" && body?.enrollmentId) {
    const en = await prisma.transportEnrollment.findUnique({
      where: { id: body.enrollmentId },
      include: { route: true, student: true },
    });
    if (!en || en.status !== "ACTIVE") {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }
    if (!en.route.feeAmount || en.route.feeAmount <= 0) {
      return NextResponse.json({ error: "Route has no fee amount set" }, { status: 400 });
    }
    const term = await prisma.term.findFirst({ where: { isCurrent: true } });
    if (!term) {
      return NextResponse.json({ error: "No current term set" }, { status: 400 });
    }
    const inv = await prisma.invoice.create({
      data: {
        studentId: en.studentId,
        termId: term.id,
        lineItems: JSON.stringify([
          { name: `Transport: ${en.route.name}`, amount: en.route.feeAmount },
        ]),
        totalAmount: en.route.feeAmount,
        status: "UNPAID",
      },
    });
    await logAudit({
      userId: session.userId,
      action: "TRANSPORT_FEE_INVOICE",
      entity: "Invoice",
      entityId: inv.id,
      details: { enrollmentId: en.id, route: en.route.name },
    });
    return NextResponse.json({ invoice: inv });
  }

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
      name: parsed.data.name.trim(),
      vehicle: parsed.data.vehicle?.trim() || null,
      driverName: parsed.data.driverName?.trim() || null,
      driverPhone: parsed.data.driverPhone?.trim() || null,
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
