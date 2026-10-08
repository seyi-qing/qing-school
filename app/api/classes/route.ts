import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";

const CreateClassSchema = z.object({ name: z.string().min(1), order: z.coerce.number().default(0) });
const CreateArmSchema = z.object({ schoolClassId: z.string(), name: z.string().min(1) });
const CreateSubjectSchema = z.object({
  subjectName: z.string().min(1),
  code: z.string().optional(),
});
const AssignSubjectSchema = z.object({
  armId: z.string().min(1),
  subjectId: z.string().min(1),
});

const DeleteSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("class"), id: z.string().min(1) }),
  z.object({ kind: z.literal("arm"), id: z.string().min(1) }),
  z.object({ kind: z.literal("subject"), id: z.string().min(1) }),
]);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const schoolId = await resolveSchoolId(session);
  const classes = await prisma.schoolClass.findMany({
    where: schoolWhere(schoolId),
    include: { arms: { include: { students: { select: { id: true } } } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ classes });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_CLASSES")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const schoolId = await resolveSchoolId(session);

  if (body?.subjectName && !body?.schoolClassId && !body?.armId) {
    const parsed = CreateSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid subject data." }, { status: 400 });
    }
    const name = parsed.data.subjectName.trim();
    const existing = await prisma.subject.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "Subject already exists.", subject: existing }, { status: 409 });
    }
    const subject = await prisma.subject.create({
      data: {
        name,
        code: parsed.data.code?.trim() || null,
      },
    });
    await logAudit({
      userId: session.userId,
      schoolId: schoolId ?? undefined,
      action: "CREATE_SUBJECT",
      entity: "Subject",
      entityId: subject.id,
    });
    return NextResponse.json({ subject }, { status: 201 });
  }

  if (body?.armId && body?.subjectId) {
    const parsed = AssignSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid assign data." }, { status: 400 });
    }
    const arm = await prisma.arm.findUnique({
      where: { id: parsed.data.armId },
      include: { schoolClass: true },
    });
    if (!arm) return NextResponse.json({ error: "Arm not found." }, { status: 404 });
    if (schoolId && arm.schoolClass.schoolId && arm.schoolClass.schoolId !== schoolId) {
      return NextResponse.json({ error: "Arm not found." }, { status: 404 });
    }
    const existing = await prisma.armSubject.findUnique({
      where: {
        armId_subjectId: {
          armId: parsed.data.armId,
          subjectId: parsed.data.subjectId,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Subject already assigned to this arm.", armSubject: existing },
        { status: 409 }
      );
    }
    const armSubject = await prisma.armSubject.create({
      data: {
        armId: parsed.data.armId,
        subjectId: parsed.data.subjectId,
      },
    });
    await logAudit({
      userId: session.userId,
      schoolId: schoolId ?? undefined,
      action: "ASSIGN_SUBJECT",
      entity: "ArmSubject",
      entityId: armSubject.id,
    });
    return NextResponse.json({ armSubject }, { status: 201 });
  }

  if (body?.schoolClassId) {
    const parsed = CreateArmSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid arm data." }, { status: 400 });
    const parent = await prisma.schoolClass.findUnique({ where: { id: parsed.data.schoolClassId } });
    if (!parent) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    if (schoolId && parent.schoolId && parent.schoolId !== schoolId) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }
    const arm = await prisma.arm.create({ data: parsed.data });
    await logAudit({
      userId: session.userId,
      schoolId: schoolId ?? undefined,
      action: "CREATE_ARM",
      entity: "Arm",
      entityId: arm.id,
    });
    return NextResponse.json({ arm }, { status: 201 });
  }

  const parsed = CreateClassSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid class data." }, { status: 400 });
  const schoolClass = await prisma.schoolClass.create({
    data: { ...parsed.data, schoolId: schoolId ?? undefined },
  });
  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "CREATE_CLASS",
    entity: "SchoolClass",
    entityId: schoolClass.id,
  });
  return NextResponse.json({ schoolClass }, { status: 201 });
}

/**
 * Safe delete: blocks if students (class/arm) or scores (subject) exist.
 * Empty mistaken entries can be removed.
 */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_CLASSES")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delete request." }, { status: 400 });
  }

  const schoolId = await resolveSchoolId(session);
  const { kind, id } = parsed.data;

  if (kind === "class") {
    const sc = await prisma.schoolClass.findUnique({
      where: { id },
      include: {
        arms: {
          include: {
            students: {
              where: { status: { in: ["ACTIVE", "APPLIED"] } },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!sc) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    if (schoolId && sc.schoolId && sc.schoolId !== schoolId) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }
    const studentCount = sc.arms.reduce((n, a) => n + a.students.length, 0);
    if (studentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete class "${sc.name}": ${studentCount} student(s) still assigned. Move or archive them first.`,
        },
        { status: 409 }
      );
    }
    await prisma.schoolClass.delete({ where: { id } });
    await logAudit({
      userId: session.userId,
      schoolId: schoolId ?? undefined,
      action: "DELETE_CLASS",
      entity: "SchoolClass",
      entityId: id,
      details: { name: sc.name },
    });
    return NextResponse.json({ ok: true, deleted: "class" });
  }

  if (kind === "arm") {
    const arm = await prisma.arm.findUnique({
      where: { id },
      include: {
        schoolClass: true,
        students: {
          where: { status: { in: ["ACTIVE", "APPLIED"] } },
          select: { id: true },
        },
      },
    });
    if (!arm) return NextResponse.json({ error: "Arm not found." }, { status: 404 });
    if (schoolId && arm.schoolClass.schoolId && arm.schoolClass.schoolId !== schoolId) {
      return NextResponse.json({ error: "Arm not found." }, { status: 404 });
    }
    if (arm.students.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete arm "${arm.name}": ${arm.students.length} student(s) assigned. Reassign them first.`,
        },
        { status: 409 }
      );
    }
    await prisma.arm.delete({ where: { id } });
    await logAudit({
      userId: session.userId,
      schoolId: schoolId ?? undefined,
      action: "DELETE_ARM",
      entity: "Arm",
      entityId: id,
      details: { name: arm.name, classId: arm.schoolClassId },
    });
    return NextResponse.json({ ok: true, deleted: "arm" });
  }

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      armLinks: { include: { scores: { select: { id: true }, take: 1 } } },
    },
  });
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  const hasScores = subject.armLinks.some((l) => l.scores.length > 0);
  if (hasScores) {
    return NextResponse.json(
      {
        error: `Cannot delete "${subject.name}": scores already exist. Keep the subject or clear scores first.`,
      },
      { status: 409 }
    );
  }
  await prisma.subject.delete({ where: { id } });
  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "DELETE_SUBJECT",
    entity: "Subject",
    entityId: id,
    details: { name: subject.name },
  });
  return NextResponse.json({ ok: true, deleted: "subject" });
}
