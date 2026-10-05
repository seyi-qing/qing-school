import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, verifyPassword, createSession } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const check = validatePassword(parsed.data.newPassword);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current one." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null },
  });

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    schoolId: user.schoolId ?? null,
    mustChangePassword: false,
    sessionVersion: user.sessionVersion + 1,
  });

  await logAudit({
    userId: session.userId,
    action: "CHANGE_PASSWORD",
    entity: "User",
    entityId: user.id,
  });

  return NextResponse.json({
    ok: true,
    message: "Password updated.",
    redirectTo: user.role === "PLATFORM_ADMIN" ? "/platform" : undefined,
  });
}
