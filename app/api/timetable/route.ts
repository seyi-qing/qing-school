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
  force: z.boolean().optional(),
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

  const { armId, armSubjectId, dayOfWeek, period, force } = parsed.data;

  const link = await prisma.armSubject.findFirst({
    where: { id: armSubjectId, armId },
    include: {
      subject: true,
      teacher: true,
      arm: { include: { schoolClass: true } },
    },
  });
  if (!link) {
    return NextResponse.json({ error: "Subject not linked to this arm" }, { status: 400 });
  }

  let conflicts: {
    armLabel: string;
    subjectName: string;
    teacherName: string;
  }[] = [];

  if (link.teacherId) {
    const teacherSlots = await prisma.timetableSlot.findMany({
      where: {
        dayOfWeek,
        period,
        NOT: { armId },
        armSubject: { teacherId: link.teacherId },
      },
      include: {
        arm: { include: { schoolClass: true } },
        armSubject: {
          include: { subject: true, teacher: true },
        },
      },
    });

    conflicts = teacherSlots.map((s) => ({
      armLabel: `${s.arm.schoolClass.name} ${s.arm.name}`,
      subjectName: s.armSubject.subject.name,
      teacherName: s.armSubject.teacher
        ? `${s.armSubject.teacher.firstName} ${s.armSubject.teacher.lastName}`
        : "Teacher",
    }));

    if (conflicts.length > 0 && !force) {
      return NextResponse.json(
        {
          error: "Teacher timetable conflict",
          conflicts,
          message: `${conflicts[0].teacherName} is already assigned to ${conflicts[0].subjectName} in ${conflicts[0].armLabel} at this period.`,
        },
        { status: 409 }
      );
    }
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
    details: conflicts.length ? { forced: !!force, conflicts } : undefined,
  });

  return NextResponse.json({ slot, conflicts });
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
