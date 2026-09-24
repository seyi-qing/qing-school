import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const UpsertSchema = z.object({
  armId: z.string(),
  armSubjectId: z.string(),
  dayOfWeek: z.coerce.number().int().min(0).max(4),
  period: z.coerce.number().int().min(1).max(10),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const armId = new URL(req.url).searchParams.get("armId");
  if (!armId) return NextResponse.json({ error: "armId required" }, { status: 400 });

  const slots = await prisma.timetableSlot.findMany({
    where: { armId },
    include: {
      armSubject: { include: { subject: true, teacher: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
  });

  return NextResponse.json({ slots });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_CLASSES")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid slot data" }, { status: 400 });
  }

  const { armId, armSubjectId, dayOfWeek, period } = parsed.data;

  const link = await prisma.armSubject.findFirst({
    where: { id: armSubjectId, armId },
  });
  if (!link) {
    return NextResponse.json({ error: "Subject not linked to this arm" }, { status: 400 });
  }

  const slot = await prisma.timetableSlot.upsert({
    where: {
      armId_dayOfWeek_period: { armId, dayOfWeek, period },
    },
    update: { armSubjectId },
    create: { armId, armSubjectId, dayOfWeek, period },
  });

  await logAudit({
    userId: session.userId,
    action: "UPSERT_TIMETABLE_SLOT",
    entity: "TimetableSlot",
    entityId: slot.id,
  });

  return NextResponse.json({ slot });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_CLASSES")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.timetableSlot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
