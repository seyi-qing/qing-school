/**
 * Apply gateway payment to invoice — transactional + idempotent.
 */
import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";

export async function finalizeOnlinePayment(params: {
  reference: string;
  amountNaira?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { reference: params.reference },
    });

    if (!existing) {
      return { ok: false as const, error: "Payment reference not found" };
    }

    if (existing.status === "SUCCESS") {
      return { ok: true as const, payment: existing, alreadyApplied: true };
    }

    const amount =
      params.amountNaira && params.amountNaira > 0
        ? toMoney(params.amountNaira)
        : toMoney(existing.amount);

    const invoice = await tx.invoice.findUnique({
      where: { id: existing.invoiceId },
    });
    if (!invoice) {
      return { ok: false as const, error: "Invoice not found" };
    }

    const payment = await tx.payment.update({
      where: { id: existing.id },
      data: { status: "SUCCESS", amount },
    });

    const prevPaid = toMoney(invoice.amountPaid);
    const total = toMoney(invoice.totalAmount);
    const newPaid = Math.round((prevPaid + amount + Number.EPSILON) * 100) / 100;
    const status =
      newPaid >= total - 0.01 ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newPaid, status },
    });

    return { ok: true as const, payment, alreadyApplied: false };
  });
}
