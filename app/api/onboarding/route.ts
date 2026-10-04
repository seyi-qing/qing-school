import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/password-policy";

const OnboardSchema = z.object({
  schoolName: z.string().min(3).max(120),
  shortName: z.string().min(2).max(12),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens"),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(10),
  adminName: z.string().min(2).max(80),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]).default("STARTER"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = OnboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid onboarding data" }, { status: 400 });
  }
  const data = parsed.data;
  const pw = validatePassword(data.adminPassword);
  if (!pw.ok) return NextResponse.json({ error: pw.message }, { status: 400 });

  const slugTaken = await prisma.school.findUnique({ where: { slug: data.slug } });
  if (slugTaken) return NextResponse.json({ error: "That school URL slug is already taken." }, { status: 409 });

  const emailTaken = await prisma.user.findUnique({ where: { email: data.adminEmail.toLowerCase() } });
  if (emailTaken) return NextResponse.json({ error: "Admin email already registered." }, { status: 409 });

  const passwordHash = await hashPassword(data.adminPassword);
  const [firstName, ...rest] = data.adminName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const result = await prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        slug: data.slug,
        name: data.schoolName,
        shortName: data.shortName.toUpperCase(),
        phone: data.phone,
        address: data.address,
        plan: data.plan,
        isActive: true,
        isDemo: false,
        maxStudents: data.plan === "STARTER" ? 300 : data.plan === "PRO" ? 1500 : 10000,
      },
    });
    const user = await tx.user.create({
      data: {
        email: data.adminEmail.toLowerCase(),
        passwordHash,
        role: "ADMIN",
        schoolId: school.id,
        isActive: true,
      },
    });
    await tx.staff.create({
      data: {
        staffId: `${data.shortName.toUpperCase()}-ADM-001`,
        userId: user.id,
        firstName,
        lastName,
        category: "ADMIN",
        designation: "School Administrator",
        schoolId: school.id,
      },
    });
    const year = new Date().getFullYear();
    await tx.session.create({
      data: {
        schoolId: school.id,
        name: `${year}/${year + 1}`,
        isCurrent: true,
        terms: { create: { name: "First Term", isCurrent: true } },
      },
    });
    return { school, user };
  });

  await logAudit({
    userId: result.user.id,
    action: "ONBOARD_SCHOOL",
    entity: "School",
    entityId: result.school.id,
    details: { slug: data.slug, plan: data.plan },
  });

  return NextResponse.json({
    ok: true,
    schoolId: result.school.id,
    slug: result.school.slug,
    message: "School created. Log in with your admin email.",
    loginUrl: "/login",
  }, { status: 201 });
}
