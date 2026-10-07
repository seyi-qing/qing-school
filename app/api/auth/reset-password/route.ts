import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";

const Schema = z.object({
  token: z.string().min(32),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid reset request." }, { status: 400 });

  const check = validatePassword(parsed.data.password);
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const token = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!token || token.usedAt || token.expiresAt <= now) return null;

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await tx.user.update({
      where: { id: token.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    await tx.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: now },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, id: { not: token.id } },
      data: { usedAt: now },
    });

    return user;
  });

  if (!result) return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 });
  return NextResponse.json({ ok: true, message: "Password reset successfully.", redirectTo: "/login" });
}
