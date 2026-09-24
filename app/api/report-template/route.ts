import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const Schema = z.object({
  schoolName: z.string().min(1).max(120),
  motto: z.string().max(200).optional(),
  footerNote: z.string().max(300).optional(),
  showPosition: z.boolean().default(true),
  showAttendance: z.boolean().default(true),
  principalTitle: z.string().max(80).optional(),
  headerBg: z.string().max(20).optional(),
  accentColor: z.string().max(20).optional(),
  logoUrl: z.string().max(500).optional(),
  sections: z.array(z.string()).optional(),
});

export async function GET() {
  const tpl = await prisma.reportCardTemplate.findFirst({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({
    template: tpl
      ? JSON.parse(tpl.configJson)
      : {
          schoolName: "Force Schools",
          motto: "Excellence in Character and Learning",
          footerNote: "This is a computer-generated report.",
          showPosition: true,
          showAttendance: true,
          principalTitle: "Principal",
          headerBg: "#1a2744",
          accentColor: "#c9a227",
          sections: [
            "header",
            "studentInfo",
            "scoresTable",
            "attendance",
            "position",
            "remarks",
            "signatures",
            "footer",
          ],
        },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "IT", "PRINCIPAL"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const existing = await prisma.reportCardTemplate.findFirst();
  if (existing) {
    await prisma.reportCardTemplate.update({
      where: { id: existing.id },
      data: { configJson: JSON.stringify(parsed.data), name: "Default" },
    });
  } else {
    await prisma.reportCardTemplate.create({
      data: { name: "Default", configJson: JSON.stringify(parsed.data) },
    });
  }

  return NextResponse.json({ ok: true, template: parsed.data });
}
