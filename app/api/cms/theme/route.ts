import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const Schema = z.object({
  primary: z.string().min(4).max(20),
  accent: z.string().min(4).max(20),
  font: z.enum(["serif", "sans"]),
});

export async function GET() {
  const row = await prisma.siteTheme.findFirst();
  return NextResponse.json({
    theme: row
      ? JSON.parse(row.configJson)
      : { primary: "#1a2744", accent: "#c9a227", font: "serif" },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "IT", "SECRETARY"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const existing = await prisma.siteTheme.findFirst();
  if (existing) {
    await prisma.siteTheme.update({
      where: { id: existing.id },
      data: { configJson: JSON.stringify(parsed.data) },
    });
  } else {
    await prisma.siteTheme.create({ data: { configJson: JSON.stringify(parsed.data) } });
  }
  return NextResponse.json({ ok: true, theme: parsed.data });
}
