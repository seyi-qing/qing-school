import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/tenant-scope";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const schoolId = body.schoolId as string | undefined;
  if (!schoolId) {
    return NextResponse.json({ error: "schoolId required" }, { status: 400 });
  }
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  cookies().set(ACTIVE_SCHOOL_COOKIE, school.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  await logAudit({
    userId: session.userId,
    schoolId: school.id,
    action: "SET_ACTIVE_SCHOOL",
    entity: "School",
    entityId: school.id,
    details: { slug: school.slug },
  });

  return NextResponse.json({
    ok: true,
    schoolId: school.id,
    slug: school.slug,
    name: school.name,
  });
}

export async function DELETE() {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  cookies().delete(ACTIVE_SCHOOL_COOKIE);
  return NextResponse.json({ ok: true });
}
