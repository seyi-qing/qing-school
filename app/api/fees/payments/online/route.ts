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
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = InitiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { invoiceId, amount, provider, email } = parsed.data;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const { authorizationUrl, reference } = await initializePayment({
    provider,
    amountNaira: amount,
    email,
    metadata: { invoiceId },
  });

  await prisma.payment.create({
    data: {
      invoiceId,
      studentId: invoice.studentId,
      amount,
      method: provider,
      reference,
      status: "PENDING",
    },
  });

  return NextResponse.json({ authorizationUrl, reference });
}
