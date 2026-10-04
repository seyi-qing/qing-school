import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const Schema = z.object({
  schoolName: z.string().min(1).max(120),
  motto: z.string().max(200).optional(),
  footerNote: z.string().max(500).optional(),
  showPosition: z.boolean().optional(),
  showAttendance: z.boolean().optional(),
  principalName: z.string().max(120).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.reportTemplate.findFirst();
  return NextResponse.json({
    config: row
      ? JSON.parse(row.config)
      : {
          schoolName: "Kayvlop Magnificent School",
          motto: "Education with Godliness",
          showPosition: true,
          showAttendance: true,
        },
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid config" }, { status: 400 });
  }

  const existing = await prisma.reportTemplate.findFirst();
  const config = JSON.stringify(parsed.data);
  if (existing) {
    await prisma.reportTemplate.update({ where: { id: existing.id }, data: { config } });
  } else {
    await prisma.reportTemplate.create({ data: { config } });
  }
  return NextResponse.json({ ok: true });
}
