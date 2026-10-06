/**
 * Simple in-memory rate limiter for auth endpoints.
 * Sufficient for single-instance / Vercel serverless warm instances.
 * For multi-region production scale, replace with Redis / Upstash.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 20;

export function rateLimitKey(ip: string, email?: string): string {
  const e = (email || "").toLowerCase().trim();
  return `${ip}|${e}`;
}

export function checkRateLimit(
  key: string,
  opts?: { max?: number; windowMs?: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  const max = opts?.max ?? MAX_ATTEMPTS;
  const windowMs = opts?.windowMs ?? WINDOW_MS;
  const now = Date.now();
  let b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }

  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }

  b.count += 1;
  return { ok: true };
}

/** Call on successful login to ease the counter slightly. */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

/** Test helper */
export function _resetRateLimitStore(): void {
  buckets.clear();
}
