/** Nigerian phone helpers shared by fee reminders and attendance SMS. */

const PHONE_RE = /(?:\+?234|0)?[789][01]\d{8}/;

export function normalizePhone(raw: string): string {
  let p = raw.replace(/\s|-/g, "");
  if (p.startsWith("0")) p = "234" + p.slice(1);
  if (!p.startsWith("234") && !p.startsWith("+")) p = "234" + p;
  return p.startsWith("+") ? p : "+" + p;
}

export function extractPhone(
  guardianPhone: string | null | undefined,
  notes: string | null | undefined
): string | null {
  if (guardianPhone && PHONE_RE.test(guardianPhone.replace(/\s/g, ""))) {
    return normalizePhone(guardianPhone);
  }
  if (!notes) return null;
  const m = notes.match(PHONE_RE);
  if (!m) return null;
  return normalizePhone(m[0]);
}
