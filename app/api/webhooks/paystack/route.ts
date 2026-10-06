import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { finalizeOnlinePayment } from "@/lib/payments-apply";
import { applySubscriptionWebhook } from "@/lib/integrations/subscriptions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const secret =
    process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || "";
  const paymentsMode = (process.env.PAYMENTS_MODE || "").toLowerCase();
  const allowMock = paymentsMode === "mock" || paymentsMode === "dev";

  if (!secret) {
    if (!allowMock) {
      console.error("[paystack webhook] No secret and PAYMENTS_MODE is not mock");
      return NextResponse.json(
        {
          error:
            "Webhook not configured. Set PAYSTACK_WEBHOOK_SECRET (or PAYSTACK_SECRET_KEY), or PAYMENTS_MODE=mock for development.",
        },
        { status: 503 }
      );
    }
  } else {
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: {
    event?: string;
    data?: Record<string, unknown> & {
      reference?: string;
      amount?: number;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = event.event || "";
  const data = event.data || {};

  try {
    if (name === "charge.success" && data.reference) {
      const amountNaira =
        typeof data.amount === "number" ? data.amount / 100 : undefined;
      const result = await finalizeOnlinePayment({
        reference: String(data.reference),
        amountNaira,
      });
      if (!result.ok) {
        return NextResponse.json({ received: true, applied: false, error: result.error });
      }
      return NextResponse.json({
        received: true,
        applied: !result.alreadyApplied,
        alreadyApplied: result.alreadyApplied,
      });
    }

    if (
      name.startsWith("subscription.") ||
      name.startsWith("invoice.") ||
      name === "subscription.create" ||
      name === "subscription.enable" ||
      name === "subscription.disable"
    ) {
      await applySubscriptionWebhook(
        data as Parameters<typeof applySubscriptionWebhook>[0]
      );
      return NextResponse.json({ received: true, type: "subscription" });
    }

    return NextResponse.json({ received: true, ignored: name });
  } catch (e) {
    console.error("[paystack webhook]", e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
