/**
 * Tenant scoping helpers — use on every list/write for school data.
 * PLATFORM_ADMIN may pass schoolId null (sees all). School users always scoped.
 * After backfillSchoolIds(kms), no null schoolId rows remain on tenant tables.
 */
import type { SessionPayload } from "@/lib/auth";
import { ensureDefaultSchool, backfillSchoolIds } from "@/lib/tenant";

export async function resolveSchoolId(
  session: SessionPayload | null
): Promise<string | null> {
  if (!session) return null;
  if (session.role === "PLATFORM_ADMIN") return null;
  if (session.schoolId) return session.schoolId;
  const school = await ensureDefaultSchool();
  return school.id;
}

/**
 * Prisma where fragment for school-owned rows.
 * Strict: only this schoolId. Null rows must be backfilled to KMS first.
 */
export function schoolWhere(
  schoolId: string | null | undefined
): Record<string, unknown> {
  if (!schoolId) return {};
  return { schoolId };
}

export async function assertUnderStudentCap(
  schoolId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { prisma } = await import("@/lib/db");
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return { ok: false, error: "School not found." };
  const count = await prisma.student.count({
    where: { schoolId, status: { in: ["ACTIVE", "APPLIED"] } },
  });
  if (count >= school.maxStudents) {
    return {
      ok: false,
      error: `Student limit reached for this plan (${school.maxStudents}). Upgrade plan or archive withdrawn records.`,
    };
  }
  return { ok: true };
}

export async function assertStudentInTenant(
  studentId: string,
  schoolId: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { prisma } = await import("@/lib/db");
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, schoolId: true },
  });
  if (!student) return { ok: false, status: 404, error: "Student not found" };
  if (!schoolId) return { ok: true };
  if (student.schoolId !== schoolId) {
    return { ok: false, status: 404, error: "Student not found" };
  }
  return { ok: true };
}

export async function assertStaffInTenant(
  staffId: string,
  schoolId: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { prisma } = await import("@/lib/db");
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, schoolId: true },
  });
  if (!staff) return { ok: false, status: 404, error: "Staff not found" };
  if (!schoolId) return { ok: true };
  if (staff.schoolId !== schoolId) {
    return { ok: false, status: 404, error: "Staff not found" };
  }
  return { ok: true };
}

export async function resolveSchoolIdFromRequest(req: Request): Promise<string> {
  const slug = req.headers.get("x-school-slug");
  const { prisma } = await import("@/lib/db");
  if (slug) {
    const bySlug = await prisma.school.findUnique({ where: { slug } });
    if (bySlug) return bySlug.id;
  }
  const school = await ensureDefaultSchool();
  return school.id;
}

/** Explicit backfill to KMS — also invoked from ensureDefaultSchool. */
export async function backfillKmsTenant(): Promise<Record<string, number>> {
  const school = await ensureDefaultSchool();
  return backfillSchoolIds(school.id);
}
