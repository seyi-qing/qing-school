/**
 * Production password rules for KMS accounts.
 */
export const PASSWORD_MIN_LENGTH = 10;

export type PasswordCheck = { ok: true } | { ok: false; message: string };

export function validatePassword(plain: string): PasswordCheck {
  if (typeof plain !== "string" || plain.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (!/[a-z]/.test(plain)) {
    return { ok: false, message: "Password must include a lowercase letter." };
  }
  if (!/[A-Z]/.test(plain)) {
    return { ok: false, message: "Password must include an uppercase letter." };
  }
  if (!/[0-9]/.test(plain)) {
    return { ok: false, message: "Password must include a number." };
  }
  if (!/[^A-Za-z0-9]/.test(plain)) {
    return { ok: false, message: "Password must include a symbol (e.g. !@#$)." };
  }
  const weak = ["password", "welcome123", "12345678", "changeme", "admin123"];
  if (weak.some((w) => plain.toLowerCase().includes(w))) {
    return { ok: false, message: "Password is too common. Choose something harder to guess." };
  }
  return { ok: true };
}

export function passwordPolicyHint(): string {
  return `At least ${PASSWORD_MIN_LENGTH} characters, with upper, lower, number, and symbol.`;
}
