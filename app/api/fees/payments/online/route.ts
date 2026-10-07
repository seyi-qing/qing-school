import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializePayment } from "@/lib/integrations/payments";

const InitiateSchema = z.object({
  invoiceId: z.string(),
  amount: z.coerce.number().positive(),
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE"]),
  email: z.string().email(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = InitiateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { invoiceId, amount, provider, email } = parsed.data;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, schoolId: session.schoolId },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const remaining = Number(invoice.totalAmount) - Number(invoice.amountPaid);
  if (amount > remaining + 0.01) {
    return NextResponse.json({ error: "Amount exceeds balance." }, { status: 400 });
  }

  const { authorizationUrl, reference } = await initializePayment({
    provider,
    amountNaira: amount,
    email,
    metadata: { invoiceId, schoolId: session.schoolId },
  });

  await prisma.payment.create({
    data: {
      invoiceId,
      studentId: invoice.studentId,
      amount,
      method: provider,
      reference,
      status: "PENDING",
      schoolId: session.schoolId,
    },
  });

  return NextResponse.json({ authorizationUrl, reference });
}
