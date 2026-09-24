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
    .regex(/^[a-z0-9-]+$/, "slug: lowercase, numbers, hyphens"),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  published: z.boolean().default(false),
  metaTitle: z.string().max(120).optional().nullable(),
  metaDescription: z.string().max(300).optional().nullable(),
  publishAt: z.string().datetime().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "IT", "SECRETARY"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const versions = await prisma.cmsPageVersion.findMany({
      where: { pageId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ versions });
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

  // Restore version
  if (body?.action === "restore" && body?.versionId) {
    const ver = await prisma.cmsPageVersion.findUnique({ where: { id: body.versionId } });
    if (!ver) return NextResponse.json({ error: "Version not found" }, { status: 404 });
    const page = await prisma.cmsPage.update({
      where: { id: ver.pageId },
      data: {
        title: ver.title,
        body: ver.body,
        metaTitle: ver.metaTitle,
        metaDescription: ver.metaDescription,
      },
    });
    return NextResponse.json({ page });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid page data" }, { status: 400 });
  }

  const data = {
    title: parsed.data.title,
    body: parsed.data.body,
    published: parsed.data.published,
    metaTitle: parsed.data.metaTitle || null,
    metaDescription: parsed.data.metaDescription || null,
    publishAt: parsed.data.publishAt ? new Date(parsed.data.publishAt) : null,
  };

  const page = await prisma.cmsPage.upsert({
    where: { slug: parsed.data.slug },
    update: data,
    create: { slug: parsed.data.slug, ...data },
  });

  // History snapshot (keep last ~20 via prune)
  await prisma.cmsPageVersion.create({
    data: {
      pageId: page.id,
      title: page.title,
      body: page.body,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      savedBy: session.userId,
    },
  });
  const old = await prisma.cmsPageVersion.findMany({
    where: { pageId: page.id },
    orderBy: { createdAt: "desc" },
    skip: 20,
    select: { id: true },
  });
  if (old.length) {
    await prisma.cmsPageVersion.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }

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
  await prisma.cmsPageVersion.deleteMany({ where: { pageId: id } });
  await prisma.cmsPage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
