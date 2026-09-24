import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      arm: { include: { schoolClass: true } },
      invoices: { include: { payments: true }, orderBy: { createdAt: "desc" } },
      scores: { include: { armSubject: { include: { subject: true } } } },
      attendances: { orderBy: { date: "desc" }, take: 30 },
      parentLinks: { include: { parent: { select: { email: true } } } },
    },
  });

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  if (session.role === "STUDENT") {
    const owns = await prisma.student.findFirst({ where: { id: params.id, userId: session.userId } });
    if (!owns) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "PARENT") {
    const linked = await prisma.parentLink.findFirst({
      where: { studentId: params.id, parentId: session.userId },
    });
    if (!linked) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ student });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_STUDENTS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const allowedFields = [
    "firstName", "lastName", "otherNames", "gender", "address",
    "previousSchool", "medicalNotes", "armId", "status",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field];
  }

  const student = await prisma.student.update({ where: { id: params.id }, data });

  await logAudit({
    userId: session.userId,
    action: "UPDATE_STUDENT",
    entity: "Student",
    entityId: student.id,
    details: data,
  });

  return NextResponse.json({ student });
}
