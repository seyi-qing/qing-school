import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { homeRouteForRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { ensureDefaultSchool } from "@/lib/tenant";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Non-platform users without a school get attached to KMS (legacy accounts)
  let schoolId = user.schoolId;
  if (!schoolId && user.role !== "PLATFORM_ADMIN") {
    const kms = await ensureDefaultSchool();
    user = await prisma.user.update({
      where: { id: user.id },
      data: { schoolId: kms.id },
    });
    schoolId = kms.id;
  }

  const mustChange = Boolean(user.mustChangePassword);

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    schoolId: schoolId ?? null,
    mustChangePassword: mustChange,
  });
  await logAudit({
    userId: user.id,
    schoolId: schoolId ?? null,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    details: {
      schoolId: schoolId ?? null,
      schoolSlug: schoolId ? "kms-or-tenant" : null,
      role: user.role,
    },
  });

  if (mustChange) {
    return NextResponse.json({
      redirectTo: "/account/password",
      mustChangePassword: true,
    });
  }

  const redirectTo =
    user.role === "PLATFORM_ADMIN" ? "/platform" : homeRouteForRole(user.role);
  return NextResponse.json({ redirectTo, mustChangePassword: false });
}
