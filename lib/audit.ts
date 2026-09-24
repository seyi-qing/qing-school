/**
 * Audit Trail
 * ------------------------------------------------------------------
 * Every write operation that matters (creating a student, recording a
 * payment, editing a score, changing a user's role...) should call
 * logAudit() so Admin/IT can answer "who did this, and when" from
 * Admin Settings > Audit Trail. This is a compliance/trust feature parents
 * and proprietors specifically expect from paid school software.
 */
import { prisma } from "@/lib/db";

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? undefined,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details ? JSON.stringify(params.details) : undefined,
    },
  });
}
