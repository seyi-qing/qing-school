import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId } from "@/lib/tenant-scope";

const FeeItemSchema = z.object({
  armId: z.string(),
  termId: z.string(),
  name: z.string().min(1),
  amount: z.coerce.number().positive(),
  compulsory: z.coerce.boolean().default(true),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const armId = searchParams.get("armId") ?? undefined;
  const termId = searchParams.get("termId") ?? undefined;

  const schoolId = await resolveSchoolId(session);
  const items = await prisma.feeItem.findMany({
    where: {
      armId,
      termId,
      ...(schoolId ? { arm: { schoolClass: { schoolId } } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_FEES")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = FeeItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const schoolId = await resolveSchoolId(session);\n  if (!schoolId) return NextResponse.json({ error: "School context required." }, { status: 409 });\n  const [arm, term] = await Promise.all([\n    prisma.arm.findFirst({ where: { id: parsed.data.armId, schoolId } }),\n    prisma.term.findFirst({ where: { id: parsed.data.termId, schoolId } }),\n  ]);\n  if (!arm || !term) return NextResponse.json({ error: "Class/term is outside your school." }, { status: 403 });\n  const item = await prisma.feeItem.create({ data: { ...parsed.data, schoolId } });

  await logAudit({ userId: session.userId, action: "CREATE_FEE_ITEM", entity: "FeeItem", entityId: item.id });

  return NextResponse.json({ item }, { status: 201 });
}
