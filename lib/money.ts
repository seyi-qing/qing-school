/**
 * Money helpers — prefer Decimal in Prisma; normalize to number for UI/math.
 * Store and compare in major units (NGN naira), 2 decimal places.
 */
export function toMoney(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? round2(value) : 0;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? round2(n) : 0;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    try {
      return round2((value as { toNumber: () => number }).toNumber());
    } catch {
      return 0;
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
