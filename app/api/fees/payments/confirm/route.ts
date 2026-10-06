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

  if (pending.status === "SUCCESS") {
    return NextResponse.json({
      ok: true,
      alreadyApplied: true,
      payment: pending,
    });
  }

  if (pending.method !== provider) {
    return NextResponse.json({ error: "Payment provider mismatch" }, { status: 400 });
  }

  const verified = await verifyPayment(provider, reference);

  // In live mode the gateway must positively verify the charge. Mock mode is
  // explicitly controlled by PAYMENTS_MODE/ALLOW_MOCK_PAYMENTS in the gateway helper.
  if (!verified.success) {
    return NextResponse.json({ error: "Payment not verified" }, { status: 402 });
  }

  const result = await finalizeOnlinePayment({
    reference,
    amountNaira: verified.amountNaira,
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
