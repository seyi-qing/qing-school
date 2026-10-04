import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendSms } from "@/lib/integrations/messaging";
import { formatNaira } from "@/lib/format";
import { SCHOOL } from "@/lib/school-config";

const PHONE_RE = /(?:\+?234|0)?[789][01]\d{8}/;

function normalizePhone(raw: string): string {
  let p = raw.replace(/\s|-/g, "");
  if (p.startsWith("0")) p = "234" + p.slice(1);
  if (!p.startsWith("234") && !p.startsWith("+")) p = "234" + p;
  return p.startsWith("+") ? p : "+" + p;
}

function extractPhone(
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

export async function POST() {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTANT", "SECRETARY"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unpaid = await prisma.invoice.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] } },
    include: { student: true },
    take: 100,
  });

  let sent = 0;
  let skipped = 0;
  const debtors = unpaid.length;

  for (const inv of unpaid) {
    const phone = extractPhone(inv.student.guardianPhone, inv.student.medicalNotes);
    if (!phone) {
      skipped++;
      continue;
    }
    const bal = inv.totalAmount - inv.amountPaid;
    const body = `${SCHOOL.shortName}: Fee reminder for ${inv.student.firstName}. Balance ${formatNaira(bal)}. Please pay at the office or online portal.`;
    const result = await sendSms({ to: phone, body });
    if (result.ok) sent++;
    else skipped++;
  }

  return NextResponse.json({
    message: `Reminders: ${sent} sent, ${skipped} skipped (no phone / SMS failed).`,
    debtors,
    sent,
    skippedNoPhoneOrFailed: skipped,
  });
}
