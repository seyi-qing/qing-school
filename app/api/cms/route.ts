import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug: lowercase letters, numbers, hyphens"),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  published: z.boolean().default(false),
});

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "IT", "SECRETARY"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const pages = await prisma.cmsPage.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ pages });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "IT", "SECRETARY"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const page = await prisma.cmsPage.upsert({
    where: { slug: parsed.data.slug },
    update: {
      title: parsed.data.title,
      body: parsed.data.body,
      published: parsed.data.published,
    },
    create: parsed.data,
  });

  await logAudit({
    userId: session.userId,
    action: "UPSERT_CMS_PAGE",
    entity: "CmsPage",
    entityId: page.id,
  });

  return NextResponse.json({ page });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "IT"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.cmsPage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
