import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLATFORM_EMAIL = "platform@kms.sch.ng";
const DEFAULT_PASSWORD = "Password123!";

/**
 * GET /api/setup/platform-admin?secret=SETUP_SECRET&confirm=CREATE
 * Creates or resets PLATFORM_ADMIN (super admin over all schools).
 * Does not touch school ADMIN accounts.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.SETUP_SECRET;
  if (!expected || expected.length < 8) {
    return NextResponse.json({ ok: false, error: "SETUP_SECRET is not set." }, { status: 503 });
  }
  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }
  if (req.nextUrl.searchParams.get("confirm") !== "CREATE") {
    return NextResponse.json({
      ok: false,
      error: "Add &confirm=CREATE to create/reset platform admin.",
      email: PLATFORM_EMAIL,
    });
  }

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
    password: DEFAULT_PASSWORD,
    note: "Change password on first login. This user is PLATFORM_ADMIN (all schools), not school ADMIN.",
  });
}
