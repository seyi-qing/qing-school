import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const RoomSchema = z.object({
  name: z.string().min(1).max(80),
  block: z.string().max(40).optional(),
  capacity: z.coerce.number().int().min(1).max(50).default(4),
  gender: z.string().max(20).optional(),
});

const AllocateSchema = z.object({
  roomId: z.string(),
  studentId: z.string(),
  bedLabel: z.string().max(20).optional(),
});

function canManage(role: string) {
  return ["ADMIN", "IT", "SECRETARY", "PRINCIPAL"].includes(role);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rooms = await prisma.hostelRoom.findMany({
    include: {
      allocations: {
        where: { status: "ACTIVE" },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        },
      },
    },
    orderBy: [{ block: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ rooms });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  // Vacate
  if (body?.action === "vacate" && body?.allocationId) {
    const alloc = await prisma.hostelAllocation.update({
      where: { id: body.allocationId },
      data: { status: "VACATED", vacatedAt: new Date() },
    });
    await logAudit({
      userId: session.userId,
      action: "VACATE_HOSTEL",
      entity: "HostelAllocation",
      entityId: alloc.id,
    });
    return NextResponse.json({ ok: true });
  }

  // Allocate
  if (body?.roomId && body?.studentId) {
    const parsed = AllocateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid allocation" }, { status: 400 });

    const room = await prisma.hostelRoom.findUnique({
      where: { id: parsed.data.roomId },
      include: { allocations: { where: { status: "ACTIVE" } } },
    });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.allocations.length >= room.capacity) {
      return NextResponse.json({ error: "Room is full" }, { status: 400 });
    }

    const existing = await prisma.hostelAllocation.findFirst({
      where: { studentId: parsed.data.studentId, status: "ACTIVE" },
    });
    if (existing) {
      return NextResponse.json({ error: "Student already has an active bed" }, { status: 400 });
    }

    const alloc = await prisma.hostelAllocation.create({
      data: {
        roomId: parsed.data.roomId,
        studentId: parsed.data.studentId,
        bedLabel: parsed.data.bedLabel || null,
      },
    });

    await logAudit({
      userId: session.userId,
      action: "ALLOCATE_HOSTEL",
      entity: "HostelAllocation",
      entityId: alloc.id,
    });
    return NextResponse.json({ allocation: alloc }, { status: 201 });
  }

  // Create room
  const parsed = RoomSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid room data" }, { status: 400 });

  const room = await prisma.hostelRoom.create({
    data: {
      name: parsed.data.name,
      block: parsed.data.block || null,
      capacity: parsed.data.capacity,
      gender: parsed.data.gender || null,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE_HOSTEL_ROOM",
    entity: "HostelRoom",
    entityId: room.id,
  });

  return NextResponse.json({ room }, { status: 201 });
}
