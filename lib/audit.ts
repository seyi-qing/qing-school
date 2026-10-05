/**
 * Audit Trail — every meaningful write should call logAudit().
 * schoolId is resolved from the actor when possible so multi-tenant
 * schools only see their own trail.
 */
import { prisma } from "@/lib/db";

export async function logAudit(params: {
  userId?: string | null;
  schoolId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  let schoolId = params.schoolId ?? undefined;
  if (!schoolId && params.userId) {
    const u = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { schoolId: true },
    });
    schoolId = u?.schoolId ?? undefined;
  }
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? undefined,
      schoolId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details ? JSON.stringify(params.details) : undefined,
    },
  });
}
