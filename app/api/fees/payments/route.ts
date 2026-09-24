import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { initializePayment } from "@/lib/integrations/payments";

const RecordPaymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER"]),
});

const InitiateOnlineSchema = z.object({
  action: z.literal("initiate_online"),
  invoiceId: z.string(),
  amount: z.coerce.number().positive(),
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE"]),
  email: z.string().email(),
});

async function applyManualPayment(
  invoiceId: string,
  amount: number,
  method: string,
  reference: string,
  recordedBy?: string
) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      studentId: invoice.studentId,
      amount,
      method,
      reference,
      status: "SUCCESS",
      recordedBy,
    },
  });

  const newPaid = invoice.amountPaid + amount;
  const status =
    newPaid >= invoice.totalAmount ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid: newPaid, status },
  });

  return payment;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // --- Online initiate (parent/office can start checkout) ---
  if (body?.action === "initiate_online") {
    const parsed = InitiateOnlineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid online payment data." }, { status: 400 });
    }

    const { invoiceId, amount, provider, email } = parsed.data;
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const remaining = invoice.totalAmount - invoice.amountPaid;
    if (amount > remaining + 0.01) {
      return NextResponse.json({ error: "Amount exceeds balance." }, { status: 400 });
    }

    try {
      const init = await initializePayment({
        provider,
        amountNaira: amount,
        email,
        metadata: {
          invoiceId,
          studentId: invoice.studentId,
          admissionNumber: invoice.student.admissionNumber,
        },
      });

      // Pending row — invoice only updates after verify/webhook
      await prisma.payment.create({
        data: {
          invoiceId,
          studentId: invoice.studentId,
          amount,
          method: provider,
          reference: init.reference,
          status: "PENDING",
        },
      });

      return NextResponse.json({
        authorizationUrl: init.authorizationUrl,
        reference: init.reference,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment init failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  // --- Manual cash / transfer ---
  const session = await getSession();
  if (!session || !can(session.role, "RECORD_PAYMENT")) {
    return NextResponse.json(
      { error: "You don't have permission to record payments." },
      { status: 403 }
    );
  }

  const parsed = RecordPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment data." }, { status: 400 });
  }

  const { invoiceId, amount, method } = parsed.data;
  const reference = `MANUAL-${Date.now()}`;
  const payment = await applyManualPayment(invoiceId, amount, method, reference, session.userId);

  await logAudit({
    userId: session.userId,
    action: "RECORD_PAYMENT",
    entity: "Payment",
    entityId: payment.id,
    details: { invoiceId, amount, method },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
