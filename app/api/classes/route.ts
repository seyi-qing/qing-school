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

export async function GET() {
  const session = await getSession();
  const schoolId = session ? await resolveSchoolId(session) : null;
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
      action: "ASSIGN_SUBJECT",
      entity: "ArmSubject",
      entityId: armSubject.id,
    });
    return NextResponse.json({ armSubject }, { status: 201 });
  }

  if (body?.schoolClassId) {
    const parsed = CreateArmSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid arm data." }, { status: 400 });
    const arm = await prisma.arm.create({ data: parsed.data });
    await logAudit({ userId: session.userId, action: "CREATE_ARM", entity: "Arm", entityId: arm.id });
    return NextResponse.json({ arm }, { status: 201 });
  }

  const parsed = CreateClassSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid class data." }, { status: 400 });
  const schoolId = await resolveSchoolId(session);
  const schoolClass = await prisma.schoolClass.create({
    data: { ...parsed.data, schoolId: schoolId ?? undefined },
  });
  await logAudit({
    userId: session.userId,
    action: "CREATE_CLASS",
    entity: "SchoolClass",
    entityId: schoolClass.id,
  });
  return NextResponse.json({ schoolClass }, { status: 201 });
}
