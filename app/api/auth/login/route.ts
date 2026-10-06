import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { homeRouteForRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { ensureDefaultSchool } from "@/lib/tenant";
import { checkRateLimit, clearRateLimit, rateLimitKey } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const key = rateLimitKey(clientIp(req), email);
  const limited = checkRateLimit(key);
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: `Too many login attempts. Try again in ${limited.retryAfterSec} seconds.`,
      },
      { status: 429 }
    );
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  clearRateLimit(key);

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
