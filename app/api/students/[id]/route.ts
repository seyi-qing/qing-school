import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId, assertStudentInTenant } from "@/lib/tenant-scope";

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

  const schoolId = await resolveSchoolId(session);
  if (schoolId && student.schoolId && student.schoolId !== schoolId) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

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

  const schoolId = await resolveSchoolId(session);
  const guard = await assertStudentInTenant(params.id, schoolId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const allowedFields = [
    "firstName",
    "lastName",
    "otherNames",
    "gender",
    "address",
    "previousSchool",
    "medicalNotes",
    "guardianPhone",
    "status",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field];
  }

  if ("armId" in body) {
    data.armId = body.armId === "" || body.armId === null ? null : body.armId;
  }

  if (typeof data.status === "string") {
    const allowed = ["ACTIVE", "APPLIED", "WITHDRAWN", "GRADUATED"];
    if (!allowed.includes(data.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
  }

  const student = await prisma.student.update({ where: { id: params.id }, data });

  await logAudit({
    userId: session.userId,
    action: data.status === "WITHDRAWN" ? "WITHDRAW_STUDENT" : "UPDATE_STUDENT",
    entity: "Student",
    entityId: student.id,
    details: data,
  });

  return NextResponse.json({ student });
}

/** Permanent delete — Admin/IT only. Requires matching admission number. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !["ADMIN", "IT"].includes(session.role)) {
    return NextResponse.json(
      { error: "Only Admin or IT can permanently delete a student." },
      { status: 403 }
    );
  }

  const schoolIdDel = await resolveSchoolId(session);
  const guardDel = await assertStudentInTenant(params.id, schoolIdDel);
  if (!guardDel.ok) return NextResponse.json({ error: guardDel.error }, { status: guardDel.status });

  const body = await req.json().catch(() => ({}));
  const confirmAdmissionNumber =
    typeof body.confirmAdmissionNumber === "string" ? body.confirmAdmissionNumber.trim() : "";
  const force = body.force === true;

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      invoices: { select: { amountPaid: true, totalAmount: true } },
      _count: {
        select: {
          scores: true,
          attendances: true,
          invoices: true,
          payments: true,
        },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (confirmAdmissionNumber !== student.admissionNumber) {
    return NextResponse.json(
      {
        error: "Confirmation failed. Type the exact admission number to delete.",
        expected: student.admissionNumber,
      },
      { status: 400 }
    );
  }

  const paidTotal = student.invoices.reduce((s, inv) => s + (inv.amountPaid || 0), 0);
  if (paidTotal > 0 && !force) {
    return NextResponse.json(
      {
        error:
          "Student has fee payments on record. Use Withdraw instead, or pass force: true for duplicate cleanup.",
        amountPaid: paidTotal,
      },
      { status: 409 }
    );
  }

  const snapshot = {
    admissionNumber: student.admissionNumber,
    name: `${student.firstName} ${student.lastName}`,
    status: student.status,
    paidTotal,
    counts: student._count,
  };

  await prisma.$transaction(async (tx) => {
    if (student.userId) {
      await tx.student.update({
        where: { id: student.id },
        data: { userId: null },
      });
    }
    await tx.student.delete({ where: { id: student.id } });
  });

  await logAudit({
    userId: session.userId,
    action: "DELETE_STUDENT",
    entity: "Student",
    entityId: params.id,
    details: { ...snapshot, forced: force },
  });

  return NextResponse.json({ ok: true, deleted: snapshot });
}
