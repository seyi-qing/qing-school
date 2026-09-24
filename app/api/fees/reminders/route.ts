import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendSms } from "@/lib/sms";
import { formatNaira } from "@/lib/format";

const PHONE_RE = /(?:\+?234|0)?[789][01]\d{8}/;

function extractPhone(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(PHONE_RE);
  if (!m) return null;
  let p = m[0].replace(/\s/g, "");
  if (p.startsWith("0")) p = "234" + p.slice(1);
  if (!p.startsWith("234") && !p.startsWith("+")) p = "234" + p;
  return p.startsWith("+") ? p : "+" + p;
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

  for (const inv of unpaid) {
    const phone = extractPhone(inv.student.medicalNotes);
    if (!phone) {
      skipped++;
      continue;
    }
    const bal = inv.totalAmount - inv.amountPaid;
    const body = `Force Schools: Fee reminder for ${inv.student.firstName}. Balance ${formatNaira(bal)}. Please pay at the office or online portal.`;
    const result = await sendSms(phone, body);
    if (result.ok) sent++;
    else skipped++;
  }

  return NextResponse.json({
    message: `Reminders: ${sent} sent, ${skipped} skipped (no phone / SMS not configured). Put phone in student medical notes e.g. Phone: 0803...`,
    sent,
    skipped,
  });
}
