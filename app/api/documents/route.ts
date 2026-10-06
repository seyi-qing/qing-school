import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId, assertStudentInTenant } from "@/lib/tenant-scope";

const CreateSchema = z.object({
  studentId: z.string(),
  label: z.string().min(1).max(120),
  fileUrl: z.string().url().max(500),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = new URL(req.url).searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const schoolId = await resolveSchoolId(session);

  if (session.role === "STUDENT") {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!me || me.id !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (session.role === "PARENT") {
    const link = await prisma.parentLink.findFirst({
      where: { parentId: session.userId, studentId },
    });
    if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (
    !can(session.role, "MANAGE_STUDENTS") &&
    session.role !== "TEACHER" &&
    session.role !== "PRINCIPAL"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (schoolId) {
    const gate = await assertStudentInTenant(studentId, schoolId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
  }

  const documents = await prisma.document.findMany({
    where: { studentId },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_STUDENTS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Need label and a valid file URL" },
      { status: 400 }
    );
  }

  const schoolId = await resolveSchoolId(session);
  if (schoolId) {
    const gate = await assertStudentInTenant(parsed.data.studentId, schoolId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
  }

  const doc = await prisma.document.create({
    data: {
      studentId: parsed.data.studentId,
      label: parsed.data.label,
      fileUrl: parsed.data.fileUrl,
    },
  });
  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "ADD_STUDENT_DOCUMENT",
    entity: "Document",
    entityId: doc.id,
  });
  return NextResponse.json({ document: doc }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_STUDENTS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const schoolId = await resolveSchoolId(session);
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { student: { select: { schoolId: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (schoolId && doc.student.schoolId && doc.student.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
