import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId } from "@/lib/tenant-scope";

function generatePinCode() {
  const part = () => Math.floor(100 + Math.random() * 900).toString();
  return `${part()}-${part()}-${part()}`;
}

const BulkSchema = z.object({
  termId: z.string().min(1),
  count: z.coerce.number().int().min(1).max(500),
});

async function assertTermInSchool(termId: string, schoolId: string | null) {
  if (!schoolId) return true;
  const term = await prisma.term.findUnique({
    where: { id: termId },
    include: { session: { select: { schoolId: true } } },
  });
  if (!term) return false;
  // Legacy sessions with null schoolId are treated as shared/default school
  if (term.session.schoolId == null) return true;
  return term.session.schoolId === schoolId;
}

/** GET: summary of pins for current term filter */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_SYSTEM_SETTINGS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await resolveSchoolId(session);
  const termId = new URL(req.url).searchParams.get("termId");

  if (termId) {
    const ok = await assertTermInSchool(termId, schoolId);
    if (!ok) return NextResponse.json({ error: "Term not found" }, { status: 404 });
  }

  const where = termId
    ? { termId }
    : schoolId
      ? { term: { session: { schoolId } } }
      : {};

  const [total, used] = await Promise.all([
    prisma.resultPin.count({ where }),
    prisma.resultPin.count({ where: { ...where, isUsed: true } }),
  ]);

  return NextResponse.json({ total, used, available: total - used });
}

/** POST: bulk-generate result checker PINs for a term */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_SYSTEM_SETTINGS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "termId and count (1–500) required" }, { status: 400 });
  }

  const { termId, count } = parsed.data;
  const schoolId = await resolveSchoolId(session);
  const ok = await assertTermInSchool(termId, schoolId);
  if (!ok) {
    return NextResponse.json({ error: "Term not found" }, { status: 404 });
  }

  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) {
    return NextResponse.json({ error: "Term not found" }, { status: 404 });
  }

  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generatePinCode());
  }

  const data = [...codes].map((code) => ({ code, termId }));
  let created = 0;
  for (const row of data) {
    try {
      await prisma.resultPin.create({ data: row });
      created++;
    } catch {
      // unique collision — skip
    }
  }

  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "BULK_GENERATE_RESULT_PINS",
    entity: "ResultPin",
    details: { termId, requested: count, created },
  });

  return NextResponse.json({ created, termId });
}
