import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const Schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const generic = { ok: true, message: "If an account exists for that email, reset instructions have been sent." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.isActive) return NextResponse.json(generic);

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) return NextResponse.json({ error: "Password reset email is not configured." }, { status: 503 });

  try {
    await sendPasswordResetEmail(user.email, origin.replace(//$/, "") + "/reset-password?token=" + rawToken);
  } catch {
    await prisma.passwordResetToken.updateMany({ where: { tokenHash }, data: { usedAt: new Date() } });
    return NextResponse.json({ error: "Password reset email is not configured." }, { status: 503 });
  }

  return NextResponse.json(generic);
}
