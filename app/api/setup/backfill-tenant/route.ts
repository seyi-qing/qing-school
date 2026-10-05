import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ensureDefaultSchool, backfillSchoolIds } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/setup/backfill-tenant
 * Assigns all null schoolId rows to the KMS school (slug "kms").
 * Admin / IT / PLATFORM_ADMIN only. Safe to run repeatedly.
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed =
    session.role === "PLATFORM_ADMIN" ||
    can(session.role, "MANAGE_SYSTEM_SETTINGS") ||
    session.role === "ADMIN" ||
    session.role === "IT";
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const kms = await ensureDefaultSchool();
  const counts = await backfillSchoolIds(kms.id);

  await logAudit({
    userId: session.userId,
    action: "BACKFILL_TENANT",
    entity: "School",
    entityId: kms.id,
    details: counts,
  });

  return NextResponse.json({
    ok: true,
    schoolId: kms.id,
    slug: kms.slug,
    name: kms.name,
    counts,
    message:
      "Legacy rows now belong to KMS. Other schools only see their own schoolId.",
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { prisma } = await import("@/lib/db");
  const nullStudents = await prisma.student.count({ where: { schoolId: null } });
  const nullStaff = await prisma.staff.count({ where: { schoolId: null } });
  const nullUsers = await prisma.user.count({
    where: { schoolId: null, role: { not: "PLATFORM_ADMIN" } },
  });
  return NextResponse.json({
    nullStudents,
    nullStaff,
    nullUsers,
    tip: "POST this route as Admin to assign null rows to KMS.",
  });
}
