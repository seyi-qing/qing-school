/**
 * Tenant scoping helpers.
 *
 * Security invariant:
 *   - Tenant identity comes only from the authenticated session.
 *   - Request body/query/header/cookie/default-school values can never establish tenant context.
 *   - Missing tenant context fails closed.
 */
import type { SessionPayload } from "@/lib/auth";
import { backfillSchoolIds } from "@/lib/tenant";

export const ACTIVE_SCHOOL_COOKIE = "kms_active_school";

export async function resolveSchoolId(
  session: SessionPayload | null,
  opts?: { allowGlobal?: boolean }
): Promise<string | null> {
  if (!session) return null;
  if (session.role === "PLATFORM_ADMIN" && opts?.allowGlobal) return null;
  return session.schoolId ?? null;
}

export function schoolWhere(schoolId: string | null | undefined): { schoolId: string } {
  if (!schoolId) {
    throw new Error("Authenticated school context is required for this operation.");
  }
  return { schoolId };
}

export function omitClientSchoolId<T extends Record<string, unknown>>(
  body: T
): Omit<T, "schoolId"> {
  const { schoolId: _drop, ...rest } = body;
  return rest as Omit<T, "schoolId">;
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
  if (!schoolId) {
    return { ok: false, status: 403, error: "Authenticated school context is required" };
  }
  const { prisma } = await import("@/lib/db");
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  });
  if (!student) return { ok: false, status: 404, error: "Student not found" };
  return { ok: true };
}

export async function assertStaffInTenant(
  staffId: string,
  schoolId: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!schoolId) {
    return { ok: false, status: 403, error: "Authenticated school context is required" };
  }
  const { prisma } = await import("@/lib/db");
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, schoolId },
    select: { id: true },
  });
  if (!staff) return { ok: false, status: 404, error: "Staff not found" };
  return { ok: true };
}

export async function resolveSchoolIdFromRequest(_req: Request): Promise<string> {
  throw new Error(
    "Request-supplied tenant identity is not accepted. Resolve schoolId from the authenticated session."
  );
}

export async function backfillKmsTenant(schoolId: string): Promise<Record<string, number>> {
  if (!schoolId) throw new Error("schoolId is required for tenant backfill.");
  return backfillSchoolIds(schoolId);
}

export async function isSchoolSuspended(schoolId: string): Promise<boolean> {
  const { prisma } = await import("@/lib/db");
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { isActive: true, subscriptionStatus: true },
  });
  if (!school) return true;
  if (!school.isActive) return true;
  const st = (school.subscriptionStatus || "").toUpperCase();
  return st === "PAST_DUE" || st === "CANCELLED" || st === "SUSPENDED";
}
