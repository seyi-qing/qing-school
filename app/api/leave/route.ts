import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId } from "@/lib/tenant-scope";

const CreateSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(3).max(500),
});

const ReviewSchema = z.object({
  id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schoolId = await resolveSchoolId(session);
  const isManager = ["ADMIN", "IT", "PRINCIPAL", "PLATFORM_ADMIN"].includes(session.role);

  if (isManager) {
    const requests = await prisma.leaveRequest.findMany({
      where: schoolId ? { staff: { schoolId } } : undefined,
      include: { staff: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ requests });
  }

  const staff = await prisma.staff.findUnique({ where: { userId: session.userId } });
  if (!staff) return NextResponse.json({ requests: [] });

  const requests = await prisma.leaveRequest.findMany({
    where: { staffId: staff.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const schoolId = await resolveSchoolId(session);

  // Manager review
  if (body?.status && body?.id) {
    if (!["ADMIN", "IT", "PRINCIPAL", "PLATFORM_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const existing = await prisma.leaveRequest.findUnique({
      where: { id: parsed.data.id },
      include: { staff: { select: { schoolId: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (schoolId && existing.staff.schoolId && existing.staff.schoolId !== schoolId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });
    await logAudit({
      userId: session.userId,
      schoolId: schoolId ?? undefined,
      action: `LEAVE_${parsed.data.status}`,
      entity: "LeaveRequest",
      entityId: updated.id,
    });
    return NextResponse.json({ request: updated });
  }

  const staff = await prisma.staff.findUnique({ where: { userId: session.userId } });
  if (!staff) {
    return NextResponse.json({ error: "No staff profile linked to your login" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid leave data" }, { status: 400 });
  }

  const request = await prisma.leaveRequest.create({
    data: {
      staffId: staff.id,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      reason: parsed.data.reason,
    },
  });

  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "REQUEST_LEAVE",
    entity: "LeaveRequest",
    entityId: request.id,
  });

  return NextResponse.json({ request }, { status: 201 });
}
