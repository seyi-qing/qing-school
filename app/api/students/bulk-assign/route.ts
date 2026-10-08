import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId } from "@/lib/tenant-scope";

const Schema = z.object({
  studentIds: z.array(z.string().min(1)).min(1).max(100),
  armId: z.string().nullable(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_STUDENTS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "studentIds and armId required" }, { status: 400 });
  }

  const { studentIds, armId } = parsed.data;
  const schoolId = await resolveSchoolId(session);

  if (armId) {
    const arm = await prisma.arm.findUnique({
      where: { id: armId },
      include: { schoolClass: { select: { schoolId: true } } },
    });
    if (!arm) return NextResponse.json({ error: "Class arm not found" }, { status: 404 });
    if (schoolId && arm.schoolClass.schoolId && arm.schoolClass.schoolId !== schoolId) {
      return NextResponse.json({ error: "Class arm not found" }, { status: 404 });
    }
  }

  if (schoolId) {
    const owned = await prisma.student.count({
      where: { id: { in: studentIds }, schoolId },
    });
    if (owned !== studentIds.length) {
      return NextResponse.json(
        { error: "One or more students are outside your school." },
        { status: 403 }
      );
    }
  }

  const result = await prisma.student.updateMany({
    where: {
      id: { in: studentIds },
      ...(schoolId ? { schoolId } : {}),
    },
    data: { armId: armId || null },
  });

  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "BULK_ASSIGN_CLASS",
    entity: "Student",
    details: { count: result.count, armId },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
