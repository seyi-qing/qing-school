/**
 * Production-safe gate for bootstrap / seed endpoints.
 *
 * Rules:
 * - SETUP_SECRET must be set and match the request secret.
 * - In production (NODE_ENV=production or VERCEL_ENV=production),
 *   ALLOW_PRODUCTION_SETUP must be exactly "true".
 * - Optional: ALLOW_SETUP_SEED=false forces seed off even in development.
 */
import { NextResponse } from "next/server";

export function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

export function assertSetupAllowed(
  secretFromRequest: string | null,
  opts?: { requireConfirm?: string; confirmValue?: string | null }
): { ok: true } | { ok: false; response: NextResponse } {
  const expected = process.env.SETUP_SECRET;
  if (!expected || expected.length < 8) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "SETUP_SECRET is not set on the server." },
        { status: 503 }
      ),
    };
  }
  if (secretFromRequest !== expected) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 }),
    };
  }

  if (isProductionRuntime()) {
    if (process.env.ALLOW_PRODUCTION_SETUP !== "true") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            error:
              "Setup endpoints are disabled in production. Set ALLOW_PRODUCTION_SETUP=true only for a controlled bootstrap window, then remove it.",
          },
          { status: 403 }
        ),
      };
    }
  }

  if (process.env.ALLOW_SETUP_SEED === "false" || process.env.ALLOW_SETUP_SEED === "0") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Setup seed is disabled (ALLOW_SETUP_SEED=false). Re-enable temporarily only if you must re-bootstrap, then disable again.",
        },
        { status: 403 }
      ),
    };
  }

  if (opts?.requireConfirm) {
    if (opts.confirmValue !== opts.requireConfirm) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            error: `Add &confirm=${opts.requireConfirm} to the URL to proceed.`,
          },
          { status: 400 }
        ),
      };
    }
  }

  return { ok: true };
}
