import { NextRequest, NextResponse } from "next/server";
import { verifyPayment, type PaymentProvider } from "@/lib/integrations/payments";
import { finalizeOnlinePayment } from "@/lib/payments-apply";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Called by /pay/[reference] after gateway redirect (or mock confirm).
 * Verifies with provider then marks invoice paid.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const reference = body?.reference as string | undefined;
  const provider = (body?.provider as PaymentProvider) || "PAYSTACK";

  if (!reference) {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }

  const pending = await prisma.payment.findUnique({ where: { reference } });
  if (!pending) {
    return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
  }

  const verified = await verifyPayment(provider, reference);
  if (!verified.success && process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Payment not verified" }, { status: 402 });
  }

  const result = await finalizeOnlinePayment({
    reference,
    amountNaira: verified.amountNaira || pending.amount,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    alreadyApplied: result.alreadyApplied,
    payment: result.payment,
  });
}
