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

/** Hard IDOR guard: student must belong to the caller's school (PLATFORM_ADMIN skips). */
export async function assertStudentInTenant(
  studentId: string,
  schoolId: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const student = await (await import("@/lib/db")).prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, schoolId: true },
  });
  if (!student) return { ok: false, status: 404, error: "Student not found" };
  if (schoolId && student.schoolId && student.schoolId !== schoolId) {
    return { ok: false, status: 404, error: "Student not found" };
  }
  return { ok: true };
}

/** Staff must belong to caller's school. */
export async function assertStaffInTenant(
  staffId: string,
  schoolId: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const staff = await (await import("@/lib/db")).prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, schoolId: true },
  });
  if (!staff) return { ok: false, status: 404, error: "Staff not found" };
  if (schoolId && staff.schoolId && staff.schoolId !== schoolId) {
    return { ok: false, status: 404, error: "Staff not found" };
  }
  return { ok: true };
}

/** Resolve school from middleware subdomain header (public forms). */
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
