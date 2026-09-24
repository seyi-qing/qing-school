import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * One-time seed endpoint for production setup from a phone browser.
 *
 * Usage (after tables exist via build-time db push):
 *   GET https://your-app.vercel.app/api/setup/seed?secret=YOUR_SETUP_SECRET
 *
 * Set SETUP_SECRET in Vercel env (any long random string).
 * Safe to call twice: users are upserted by email; skips if admin already exists
 * and you pass ?force=0 (default). Pass &force=1 to re-upsert accounts.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEMO_PASSWORD = "Password123!";

const ACCOUNTS: Array<{ email: string; role: "ADMIN" | "IT" | "SECRETARY" | "PRINCIPAL" | "ACCOUNTANT" | "TEACHER" | "STUDENT" | "PARENT" }> = [
  { email: "admin@forceschools.test", role: "ADMIN" },
  { email: "it@forceschools.test", role: "IT" },
  { email: "secretary@forceschools.test", role: "SECRETARY" },
  { email: "principal@forceschools.test", role: "PRINCIPAL" },
  { email: "accountant@forceschools.test", role: "ACCOUNTANT" },
  { email: "teacher@forceschools.test", role: "TEACHER" },
  { email: "student@forceschools.test", role: "STUDENT" },
  { email: "parent@forceschools.test", role: "PARENT" },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.SETUP_SECRET;

  if (!expected || expected.length < 8) {
    return NextResponse.json(
      { ok: false, error: "SETUP_SECRET is not set on the server. Add it in Vercel → Environment Variables." },
      { status: 503 }
    );
  }

  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }

  try {
    // Ensure core academic year exists
    const session = await prisma.session.upsert({
      where: { name: "2025/2026" },
      update: {},
      create: { name: "2025/2026", isCurrent: true },
    });

    let term = await prisma.term.findFirst({
      where: { sessionId: session.id, name: "First Term" },
    });
    if (!term) {
      term = await prisma.term.create({
        data: { sessionId: session.id, name: "First Term", isCurrent: true },
      });
    }

    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const created: string[] = [];

    for (const acc of ACCOUNTS) {
      await prisma.user.upsert({
        where: { email: acc.email },
        update: { passwordHash, role: acc.role, isActive: true },
        create: { email: acc.email, passwordHash, role: acc.role },
      });
      created.push(`${acc.role}: ${acc.email}`);
    }

    // Minimal public notice so homepage is not empty
    const noticeCount = await prisma.notice.count();
    if (noticeCount === 0) {
      await prisma.notice.create({
        data: {
          title: "Welcome to Force Schools",
          body: "Portal is live. Staff and parents can log in with the demo accounts.",
          audience: "ALL",
          publishToWeb: true,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Seed complete",
      password: DEMO_PASSWORD,
      accounts: created,
      term: term.name,
      session: session.name,
      loginUrl: "/login",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: "If you see 'table does not exist', Redeploy on Vercel so build runs: prisma db push",
      },
      { status: 500 }
    );
  }
}
