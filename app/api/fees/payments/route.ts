import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const RecordPaymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER"]),
});

async function applyPayment(
  invoiceId: string,
  amount: number,
  method: string,
  reference: string,
  recordedBy?: string
) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  const payment = await prisma.payment.create({
    data: { invoiceId, studentId: invoice.studentId, amount, method, reference, recordedBy },
  });

  const newPaid = invoice.amountPaid + amount;
  const status = newPaid >= invoice.totalAmount ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid: newPaid, status },
  });

  return payment;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "RECORD_PAYMENT")) {
    return NextResponse.json({ error: "You don't have permission to record payments." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RecordPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment data." }, { status: 400 });
  }

  const { invoiceId, amount, method } = parsed.data;
  const reference = `MANUAL-${Date.now()}`;
  const payment = await applyPayment(invoiceId, amount, method, reference, session.userId);

  await logAudit({
    userId: session.userId,
    action: "RECORD_PAYMENT",
    entity: "Payment",
    entityId: payment.id,
    details: { invoiceId, amount, method },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
