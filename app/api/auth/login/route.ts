import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { homeRouteForRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

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
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const mustChange = Boolean(user.mustChangePassword);

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    schoolId: user.schoolId ?? null,
    mustChangePassword: mustChange,
  });
  await logAudit({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    details: { schoolId: user.schoolId },
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
