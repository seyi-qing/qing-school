import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/** Lightweight operational snapshot for backup drills (not a full pg_dump). */
export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "IT"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [students, staff, invoices, payments, terms, classes] = await Promise.all([
    prisma.student.count(),
    prisma.staff.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.term.findMany({ select: { id: true, name: true, isCurrent: true } }),
    prisma.schoolClass.findMany({
      select: { id: true, name: true, arms: { select: { id: true, name: true } } },
    }),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    counts: { students, staff, invoices, payments },
    terms,
    classes,
    note: "This is a metadata snapshot for ops drills. Use Postgres host backups (Neon/Supabase) for full restore.",
  };

  await logAudit({
    userId: session.userId,
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
