import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  resolveSchoolId,
  schoolWhere,
  assertStudentInTenant,
} from "@/lib/tenant-scope";
import { toMoney } from "@/lib/money";

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

async function assertRouteInTenant(
  routeId: string,
  schoolId: string | null
): Promise<
  | { ok: true; route: { id: string; schoolId: string | null; feeAmount: number; name: string } }
  | { ok: false; status: number; error: string }
> {
  const route = await prisma.transportRoute.findUnique({
    where: { id: routeId },
    select: { id: true, schoolId: true, feeAmount: true, name: true },
  });
  if (!route) return { ok: false, status: 404, error: "Route not found" };
  if (schoolId && route.schoolId && route.schoolId !== schoolId) {
    return { ok: false, status: 404, error: "Route not found" };
  }
  return { ok: true, route: { ...route, feeAmount: toMoney(route.feeAmount) } };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schoolId = await resolveSchoolId(session);
  const routes = await prisma.transportRoute.findMany({
    where: schoolWhere(schoolId),
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
  if (!session || !can(session.role, "MANAGE_TRANSPORT")) {
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

  const schoolId = await resolveSchoolId(session);
  const gate = await assertRouteInTenant(parsed.data.id, schoolId);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

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
    schoolId: schoolId ?? undefined,
    action: "UPDATE_TRANSPORT_ROUTE",
    entity: "TransportRoute",
    entityId: route.id,
    details: {
      name: route.name,
      feeAmount: toMoney(route.feeAmount),
    },
  });

  return NextResponse.json({ route });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_TRANSPORT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "Route id required" }, { status: 400 });

  const schoolId = await resolveSchoolId(session);
  const gate = await assertRouteInTenant(id, schoolId);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const activeRiders = await prisma.transportEnrollment.count({
    where: { routeId: id, status: "ACTIVE" },
  });
  if (activeRiders > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${activeRiders} active rider(s). Remove them first.` },
      { status: 409 }
    );
  }

  await prisma.transportRoute.delete({ where: { id } });
  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "DELETE_TRANSPORT_ROUTE",
    entity: "TransportRoute",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_TRANSPORT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const schoolId = await resolveSchoolId(session);

  if (body?.action === "createFeeInvoice" && body?.enrollmentId) {
    const en = await prisma.transportEnrollment.findUnique({
      where: { id: body.enrollmentId },
      include: { route: true, student: true },
    });
    if (!en || en.status !== "ACTIVE") {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }
    if (schoolId) {
      if (en.route.schoolId && en.route.schoolId !== schoolId) {
        return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
      }
      if (en.student.schoolId && en.student.schoolId !== schoolId) {
        return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
      }
    }
    const fee = toMoney(en.route.feeAmount);
    if (fee <= 0) {
      return NextResponse.json({ error: "Route has no fee amount set" }, { status: 400 });
    }
    const term = await prisma.term.findFirst({
      where: {
        isCurrent: true,
        ...(schoolId ? { session: { schoolId } } : {}),
      },
    });
    if (!term) {
      return NextResponse.json({ error: "No current term set" }, { status: 400 });
    }
    const inv = await prisma.invoice.create({
      data: {
        studentId: en.studentId,
        termId: term.id,
        lineItems: JSON.stringify([{ name: `Transport: ${en.route.name}`, amount: fee }]),
        totalAmount: fee,
        status: "UNPAID",
      },
    });
    await logAudit({
      userId: session.userId,
      schoolId: schoolId ?? undefined,
      action: "TRANSPORT_FEE_INVOICE",
      entity: "Invoice",
      entityId: inv.id,
      details: { enrollmentId: en.id, route: en.route.name },
    });
    return NextResponse.json({ invoice: inv });
  }

  if (body?.action === "unenroll" && body?.enrollmentId) {
    const existing = await prisma.transportEnrollment.findUnique({
      where: { id: body.enrollmentId },
      include: { route: { select: { schoolId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }
    if (schoolId && existing.route.schoolId && existing.route.schoolId !== schoolId) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }
    const en = await prisma.transportEnrollment.update({
      where: { id: existing.id },
      data: { status: "ENDED", endDate: new Date() },
    });
    await logAudit({
      userId: session.userId,
      schoolId: schoolId ?? undefined,
      action: "UNENROLL_TRANSPORT",
      entity: "TransportEnrollment",
      entityId: en.id,
    });
    return NextResponse.json({ ok: true });
  }

  if (body?.routeId && body?.studentId) {
    const parsed = EnrollSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid enrollment" }, { status: 400 });

    const routeGate = await assertRouteInTenant(parsed.data.routeId, schoolId);
    if (!routeGate.ok) {
      return NextResponse.json({ error: routeGate.error }, { status: routeGate.status });
    }

    if (schoolId) {
      const st = await assertStudentInTenant(parsed.data.studentId, schoolId);
      if (!st.ok) {
        return NextResponse.json({ error: st.error }, { status: st.status });
      }
    }

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
      schoolId: schoolId ?? undefined,
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
      schoolId: schoolId ?? undefined,
      name: parsed.data.name.trim(),
      vehicle: parsed.data.vehicle?.trim() || null,
      driverName: parsed.data.driverName?.trim() || null,
      driverPhone: parsed.data.driverPhone?.trim() || null,
      feeAmount: parsed.data.feeAmount,
    },
  });

  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "CREATE_TRANSPORT_ROUTE",
    entity: "TransportRoute",
    entityId: route.id,
  });

  return NextResponse.json({ route }, { status: 201 });
}
