import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const SetCurrentTermSchema = z.object({ termId: z.string() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_SYSTEM_SETTINGS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SetCurrentTermSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const term = await prisma.term.findUnique({ where: { id: parsed.data.termId } });
  if (!term) return NextResponse.json({ error: "Term not found." }, { status: 404 });

  await prisma.$transaction([
    prisma.term.updateMany({ data: { isCurrent: false } }),
    prisma.session.updateMany({ data: { isCurrent: false } }),
    prisma.term.update({ where: { id: term.id }, data: { isCurrent: true } }),
    prisma.session.update({ where: { id: term.sessionId }, data: { isCurrent: true } }),
  ]);

  await logAudit({ userId: session.userId, action: "SET_CURRENT_TERM", entity: "Term", entityId: term.id });

  return NextResponse.json({ ok: true });
}
