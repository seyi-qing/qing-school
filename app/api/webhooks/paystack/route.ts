import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { finalizeOnlinePayment } from "@/lib/payments-apply";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Paystack webhook. Configure in Paystack Dashboard → Settings → API Keys & Webhooks:
 *   https://your-domain.vercel.app/api/webhooks/paystack
 *
 * Optional: set PAYSTACK_WEBHOOK_SECRET (same as secret key works for HMAC).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || "";

  if (secret) {
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: { event?: string; data?: { reference?: string; amount?: number; status?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    const amountNaira = event.data.amount ? event.data.amount / 100 : undefined;
    const result = await finalizeOnlinePayment({
      reference: event.data.reference,
      amountNaira,
    });
    if (!result.ok) {
      console.error("[paystack webhook]", result.error);
    }
  }

  return NextResponse.json({ received: true });
}
