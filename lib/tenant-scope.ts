/**
 * Tenant scoping helpers — use on every list/write for school data.
 * PLATFORM_ADMIN may pass schoolId null (sees all). School users always scoped.
 */
import type { SessionPayload } from "@/lib/auth";
import { ensureDefaultSchool } from "@/lib/tenant";

export async function resolveSchoolId(
  session: SessionPayload | null
): Promise<string | null> {
  if (!session) return null;
  if (session.role === "PLATFORM_ADMIN") return null;
  if (session.schoolId) return session.schoolId;
  // Legacy sessions without schoolId → attach to default KMS tenant
  const school = await ensureDefaultSchool();
  return school.id;
}

/** Prisma where fragment for school-owned rows */
export function schoolWhere(schoolId: string | null | undefined): { schoolId?: string } {
  if (!schoolId) return {};
  return { schoolId };
}

export async function assertUnderStudentCap(schoolId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const school = await (await import("@/lib/db")).prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return { ok: false, error: "School not found." };
  const count = await (await import("@/lib/db")).prisma.student.count({
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
