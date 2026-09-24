import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const BandSchema = z.object({
  minScore: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().min(0).max(100),
  grade: z.string().min(1),
  remark: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_SYSTEM_SETTINGS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = BandSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid grade band." }, { status: 400 });

  const band = await prisma.gradeBand.create({ data: parsed.data });
  await logAudit({ userId: session.userId, action: "CREATE_GRADE_BAND", entity: "GradeBand", entityId: band.id });
  return NextResponse.json({ band }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_SYSTEM_SETTINGS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.gradeBand.delete({ where: { id } });
  await logAudit({ userId: session.userId, action: "DELETE_GRADE_BAND", entity: "GradeBand", entityId: id });
  return NextResponse.json({ ok: true });
}
