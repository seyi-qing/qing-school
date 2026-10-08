import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";

/** Lightweight operational snapshot for backup drills (not a full pg_dump). */
export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "IT", "PLATFORM_ADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await resolveSchoolId(session);
  const sw = schoolWhere(schoolId);

  const [students, staff, invoices, payments, terms, classes] = await Promise.all([
    prisma.student.count({ where: sw }),
    prisma.staff.count({ where: sw }),
    prisma.invoice.count({ where: schoolId ? { student: { schoolId } } : {} }),
    prisma.payment.count({ where: schoolId ? { student: { schoolId } } : {} }),
    prisma.term.findMany({
      where: schoolId ? { session: { schoolId } } : {},
      select: { id: true, name: true, isCurrent: true },
    }),
    prisma.schoolClass.findMany({
      where: sw,
      select: { id: true, name: true, arms: { select: { id: true, name: true } } },
    }),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    schoolId: schoolId ?? null,
    counts: { students, staff, invoices, payments },
    terms,
    classes,
    note: "Metadata snapshot for ops drills. Use Neon branch backups for full restore.",
  };

  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "OPS_EXPORT_SNAPSHOT",
    entity: "System",
    details: { counts: snapshot.counts },
  });

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="kms-ops-snapshot-${Date.now()}.json"`,
    },
  });
}
