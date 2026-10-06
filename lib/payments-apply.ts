/** Transactional and idempotent payment finalization. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function finalizeOnlinePayment(params: { reference: string; amountNaira?: number }) {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.payment.findUnique({ where: { reference: params.reference } });
      if (!existing) return { ok: false as const, error: "Payment reference not found" };
      if (existing.status === "SUCCESS") {
        return { ok: true as const, payment: existing, alreadyApplied: true };
      }

      const amount =
        params.amountNaira && Number.isFinite(params.amountNaira) && params.amountNaira > 0
          ? new Prisma.Decimal(params.amountNaira.toFixed(2))
          : existing.amount;

      if (!amount.isFinite() || amount.lte(0)) {
        return { ok: false as const, error: "Invalid payment amount" };
      }

      // The payment row is the authoritative checkout record. A gateway/webhook
      // amount must match it exactly; never allow a client/provider mismatch to
      // change the amount applied to the invoice.
      if (!amount.equals(existing.amount)) {
        return { ok: false as const, error: "Payment amount mismatch" };
      }

      const invoice = await tx.invoice.findUnique({ where: { id: existing.invoiceId } });
      if (
        !invoice ||
        invoice.studentId !== existing.studentId ||
        invoice.schoolId !== existing.schoolId
      ) {
        return { ok: false as const, error: "Payment/invoice mismatch" };
      }

      const remaining = invoice.totalAmount.sub(invoice.amountPaid);
      if (amount.gt(remaining)) {
        return { ok: false as const, error: "Payment exceeds invoice balance" };
      }

      const payment = await tx.payment.update({
        where: { id: existing.id },
        data: { status: "SUCCESS", amount },
      });

      const newPaid = invoice.amountPaid.add(amount);
      const status = newPaid.gte(invoice.totalAmount)
        ? "PAID"
        : newPaid.gt(0)
          ? "PARTIAL"
          : "UNPAID";

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newPaid, status },
      });

      return { ok: true as const, payment, alreadyApplied: false };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
