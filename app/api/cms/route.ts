import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";

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
  if (!session || !can(session.role, "MANAGE_CMS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  const schoolId = await resolveSchoolId(session);
  if (id) {
    const page = await prisma.cmsPage.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (schoolId && page.schoolId && page.schoolId !== schoolId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const versions = await prisma.cmsPageVersion.findMany({
      where: { pageId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ versions });
  }
  const pages = await prisma.cmsPage.findMany({
    where: schoolWhere(schoolId),
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ pages });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_CMS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const schoolId = await resolveSchoolId(session);

  if (body?.action === "restore" && body?.versionId) {
    const ver = await prisma.cmsPageVersion.findUnique({
      where: { id: body.versionId },
      include: { page: { select: { schoolId: true } } },
    });
    if (!ver) return NextResponse.json({ error: "Version not found" }, { status: 404 });
    if (schoolId && ver.page.schoolId && ver.page.schoolId !== schoolId) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
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

  const existing = await prisma.cmsPage.findFirst({
    where: { slug: parsed.data.slug, schoolId: schoolId ?? undefined },
  });
  const page = existing
    ? await prisma.cmsPage.update({
        where: { id: existing.id },
        data: { ...data, schoolId: schoolId ?? existing.schoolId },
      })
    : await prisma.cmsPage.create({
        data: { slug: parsed.data.slug, schoolId, ...data },
      });

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
    schoolId: schoolId ?? undefined,
    action: "UPSERT_CMS_PAGE",
    entity: "CmsPage",
    entityId: page.id,
  });

  return NextResponse.json({ page });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_CMS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const schoolId = await resolveSchoolId(session);
  const page = await prisma.cmsPage.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (schoolId && page.schoolId && page.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.cmsPageVersion.deleteMany({ where: { pageId: id } });
  await prisma.cmsPage.delete({ where: { id } });
  await logAudit({
    userId: session.userId,
    schoolId: schoolId ?? undefined,
    action: "DELETE_CMS_PAGE",
    entity: "CmsPage",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
