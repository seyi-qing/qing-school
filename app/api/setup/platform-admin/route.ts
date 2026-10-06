import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { assertSetupAllowed } from "@/lib/setup-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLATFORM_EMAIL = "platform@kms.sch.ng";
const DEFAULT_PASSWORD = "Password123!";

/**
 * GET /api/setup/platform-admin?secret=SETUP_SECRET&confirm=CREATE
 * Creates or resets PLATFORM_ADMIN.
 * Production requires ALLOW_PRODUCTION_SETUP=true (remove after bootstrap).
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const confirm = req.nextUrl.searchParams.get("confirm");

  const gate = assertSetupAllowed(secret, {
    requireConfirm: "CREATE",
    confirmValue: confirm,
  });
  if (!gate.ok) return gate.response;

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: PLATFORM_EMAIL },
    update: {
      passwordHash,
      role: "PLATFORM_ADMIN",
      isActive: true,
      schoolId: null,
      mustChangePassword: true,
    },
    create: {
      email: PLATFORM_EMAIL,
      passwordHash,
      role: "PLATFORM_ADMIN",
      isActive: true,
      schoolId: null,
      mustChangePassword: true,
    },
  });

  return NextResponse.json({
    ok: true,
    email: user.email,
    role: user.role,
    note: "Change password on first login. Remove ALLOW_PRODUCTION_SETUP from Vercel after bootstrap.",
  });
}
