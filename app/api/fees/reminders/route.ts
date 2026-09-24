import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/integrations/messaging";
import { formatNaira } from "@/lib/format";

const Schema = z.object({
  message: z
    .string()
    .max(400)
    .optional()
    .default(
      "Reminder from Force Schools: you have an outstanding school fee balance. Please pay at the office or via the portal."
    ),
});

/** Extract phone from medicalNotes lines like "Phone: 0803..." */
function extractPhone(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/Phone:\s*([+0-9\s-]{7,20})/i);
  if (!m) return null;
  return m[1].replace(/\s+/g, "").trim();
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "SEND_FEE_REMINDERS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  const message = parsed.success ? parsed.data.message : Schema.parse({}).message;

  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] } },
    include: { student: true },
  });

  // One SMS per student (highest balance)
  const byStudent = new Map<
    string,
    { phone: string | null; name: string; balance: number; admissionNumber: string }
  >();

  for (const inv of invoices) {
    const balance = inv.totalAmount - inv.amountPaid;
    if (balance <= 0) continue;
    const prev = byStudent.get(inv.studentId);
    const phone = extractPhone(inv.student.medicalNotes);
    if (!prev || balance > prev.balance) {
      byStudent.set(inv.studentId, {
        phone,
        name: `${inv.student.firstName} ${inv.student.lastName}`,
        balance,
        admissionNumber: inv.student.admissionNumber,
      });
    }
  }

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const [, row] of byStudent) {
    if (!row.phone) {
      skipped++;
      continue;
    }
    const bodyText = `${message} (${row.name}, ${row.admissionNumber}, balance ${formatNaira(row.balance)})`;
    try {
      const result = await sendSms({ to: row.phone, body: bodyText });
      if (result.status === "SENT") sent++;
      else {
        skipped++;
        failures.push(row.admissionNumber);
      }
    } catch {
      skipped++;
      failures.push(row.admissionNumber);
    }
  }

  await logAudit({
    userId: session.userId,
    action: "SEND_FEE_REMINDERS",
    entity: "Invoice",
    details: { sent, skipped, debtors: byStudent.size },
  });

  return NextResponse.json({
    ok: true,
    debtors: byStudent.size,
    sent,
    skippedNoPhoneOrFailed: skipped,
    failures,
    note:
      "SMS needs a phone on the student record (online admissions store Phone: in notes). Without TERMII_API_KEY messages are logged only (mock).",
  });
}
