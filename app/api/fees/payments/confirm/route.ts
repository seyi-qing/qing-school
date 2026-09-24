import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const ConfirmSchema = z.object({ reference: z.string() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { reference: parsed.data.reference } });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status === "SUCCESS") {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });
  const newPaid = invoice.amountPaid + payment.amount;
  const status = newPaid >= invoice.totalAmount ? "PAID" : "PARTIAL";

  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS" } }),
    prisma.invoice.update({ where: { id: invoice.id }, data: { amountPaid: newPaid, status } }),
  ]);

  await logAudit({
    action: "ONLINE_PAYMENT_CONFIRMED",
    entity: "Payment",
    entityId: payment.id,
    details: { invoiceId: invoice.id, amount: payment.amount },
  });

  return NextResponse.json({ ok: true });
}
