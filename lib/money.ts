/**
 * Money helpers for NGN (naira).
 *
 * Prisma Decimal values must NEVER be used in raw + - * / in TypeScript.
 * Always normalize with toMoney() first → plain number (2 dp).
 */
export function toMoney(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? round2(value) : 0;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? round2(n) : 0;
  }
  // Prisma.Decimal / decimal.js
  if (typeof value === "object" && value !== null) {
    const v = value as { toNumber?: () => number; toString?: () => string };
    if (typeof v.toNumber === "function") {
      try {
        return round2(v.toNumber());
      } catch {
        /* fall through */
      }
    }
    if (typeof v.toString === "function") {
      const n = parseFloat(v.toString());
      return Number.isFinite(n) ? round2(n) : 0;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? round2(n) : 0;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function moneyEquals(a: unknown, b: unknown, eps = 0.009): boolean {
  return Math.abs(toMoney(a) - toMoney(b)) <= eps;
}

/** For writes: ensure a finite 2-dp number Prisma can store as Decimal. */
export function asMoneyInput(value: unknown): number {
  return toMoney(value);
}
