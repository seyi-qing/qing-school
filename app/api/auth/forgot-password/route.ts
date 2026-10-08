import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
});

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Always returns the same generic message to avoid email enumeration.
 * In development / when RESET_DEBUG=true, includes resetPath for testing.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const key = rateLimitKey(clientIp(req), `reset:${email}`);
  const limited = checkRateLimit(key, { max: 5, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many reset requests. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const generic = {
    ok: true,
    message:
      "If an account exists for that email, a reset link has been prepared. Check your email or ask your school admin.",
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return NextResponse.json(generic);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const base =
    (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const resetPath = `/account/reset-password?token=${rawToken}`;
  const resetUrl = base ? `${base}${resetPath}` : resetPath;

  await prisma.messageLog.create({
    data: {
      channel: "EMAIL",
      recipient: email,
      body: `Password reset link (valid 1 hour): ${resetUrl}`,
      status: process.env.SMTP_HOST ? "QUEUED" : "LOGGED_NO_SMTP",
    },
  });

  await logAudit({
    userId: user.id,
    schoolId: user.schoolId,
    action: "PASSWORD_RESET_REQUEST",
    entity: "User",
    entityId: user.id,
  });

  // Production: wire SMTP later. Staging/debug may return path.
  const debug =
    process.env.RESET_DEBUG === "true" ||
    process.env.PAYMENTS_MODE === "mock" ||
    process.env.NODE_ENV !== "production";

  if (debug) {
    return NextResponse.json({
      ...generic,
      debugResetPath: resetPath,
      note: "RESET_DEBUG or mock mode: use debugResetPath. Set SMTP_HOST for real email.",
    });
  }

  return NextResponse.json(generic);
}
