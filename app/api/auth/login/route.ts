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

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, now: number) {
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const forwarded = req.headers.get("x-forwarded-for");
  const clientIp = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const rateKey = clientIp + ":" + email.toLowerCase();
  if (isRateLimited(rateKey, Date.now())) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const nextFailedCount = (user.failedLoginCount ?? 0) + 1;
    const shouldLock = nextFailedCount >= MAX_FAILED_LOGINS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : nextFailedCount,
        lockedUntil: shouldLock
          ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
          : null,
      },
    });

    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const schoolId = user.schoolId ?? null;
  if (user.role !== "PLATFORM_ADMIN" && !schoolId) {
    return NextResponse.json(
      { error: "Your account is not assigned to a school. Contact your administrator." },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  const mustChange = Boolean(user.mustChangePassword);

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    schoolId,
    mustChangePassword: mustChange,
    sessionVersion: user.sessionVersion,
  });

  await logAudit({
    userId: user.id,
    schoolId,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    details: { schoolId, role: user.role },
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
