/**
 * Shared logic to mark an invoice paid after a successful gateway payment.
 * Used by webhooks and the mock /pay page confirmation.
 */
import { prisma } from "@/lib/db";

export async function finalizeOnlinePayment(params: {
  reference: string;
  amountNaira?: number;
}) {
  const existing = await prisma.payment.findUnique({
    where: { reference: params.reference },
  });

  if (!existing) {
    return { ok: false as const, error: "Payment reference not found" };
  }

  if (existing.status === "SUCCESS") {
    return { ok: true as const, payment: existing, alreadyApplied: true };
  }

  const amount = params.amountNaira && params.amountNaira > 0 ? params.amountNaira : existing.amount;

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: existing.invoiceId },
  });

  const payment = await prisma.payment.update({
    where: { id: existing.id },
    data: { status: "SUCCESS", amount },
  });

  const newPaid = invoice.amountPaid + amount;
  const status =
    newPaid >= invoice.totalAmount ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { amountPaid: newPaid, status },
  });

  return { ok: true as const, payment, alreadyApplied: false };
}
