import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { finalizeOnlinePayment } from "@/lib/payments-apply";
import { applySubscriptionWebhook } from "@/lib/integrations/subscriptions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Paystack webhook. Dashboard → Settings → Webhooks:
 *   https://your-domain.vercel.app/api/webhooks/paystack
 *
 * Handles:
 * - charge.success (school fee payments)
 * - subscription.create / subscription.enable / subscription.disable
 * - invoice.payment_failed / invoice.update
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

  let event: {
    event?: string;
    data?: Record<string, unknown> & {
      reference?: string;
      amount?: number;
      status?: string;
      subscription_code?: string;
      next_payment_date?: string;
      customer?: { customer_code?: string; email?: string };
      plan?: { name?: string; plan_code?: string };
      metadata?: { schoolId?: string; plan?: string; type?: string };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = event.event || "";

  if (name === "charge.success" && event.data?.reference) {
    if (event.data.metadata?.type === "saas_subscription") {
      await applySubscriptionWebhook({
        ...event.data,
        status: "active",
      });
    } else {
      const amountNaira = event.data.amount ? event.data.amount / 100 : undefined;
      const result = await finalizeOnlinePayment({
        reference: event.data.reference,
        amountNaira,
      });
      if (!result.ok) {
        console.error("[paystack webhook fee]", result.error);
      }
    }
  }

  if (
    name === "subscription.create" ||
    name === "subscription.enable" ||
    name === "subscription.disable" ||
    name === "subscription.not_renew" ||
    name === "invoice.update" ||
    name === "invoice.payment_failed"
  ) {
    const status =
      name === "subscription.disable" || name === "invoice.payment_failed"
        ? name === "invoice.payment_failed"
          ? "attention"
          : "cancelled"
        : (event.data?.status as string) || "active";
    const result = await applySubscriptionWebhook({
      ...(event.data || {}),
      status,
    });
    if (!result.ok) {
      console.error("[paystack webhook sub]", result.error);
    }
  }

  return NextResponse.json({ received: true });
}
