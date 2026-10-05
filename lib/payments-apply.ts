/** Transactional and idempotent payment finalization. */
import { prisma } from "@/lib/db";

export async function finalizeOnlinePayment(params: { reference: string; amountNaira?: number }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { reference: params.reference } });
    if (!existing) return { ok: false as const, error: "Payment reference not found" };
    if (existing.status === "SUCCESS") return { ok: true as const, payment: existing, alreadyApplied: true };
    const amount = params.amountNaira && params.amountNaira > 0 ? params.amountNaira : Number(existing.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false as const, error: "Invalid payment amount" };
    const invoice = await tx.invoice.findUnique({ where: { id: existing.invoiceId } });
    if (!invoice || invoice.studentId !== existing.studentId) return { ok: false as const, error: "Payment/invoice mismatch" };
    const remaining = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    if (amount > remaining + 0.01) return { ok: false as const, error: "Payment exceeds invoice balance" };
    const payment = await tx.payment.update({ where: { id: existing.id }, data: { status: "SUCCESS", amount } });
    const newPaid = Number(invoice.amountPaid) + amount;
    const status = newPaid >= Number(invoice.totalAmount) ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";
    await tx.invoice.update({ where: { id: invoice.id }, data: { amountPaid: newPaid, status } });
    return { ok: true as const, payment, alreadyApplied: false };
  });
}
