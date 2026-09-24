/**
 * Payment Gateway Integration (Paystack / Flutterwave)
 * ------------------------------------------------------------------
 * MOCK MODE when secret keys are unset: returns an in-app /pay/[ref] URL.
 * LIVE MODE when PAYSTACK_SECRET_KEY (or FLUTTERWAVE_SECRET_KEY) is set.
 *
 * Always confirm success via verifyPayment() or the webhook — never trust
 * the browser redirect alone.
 */

export type PaymentProvider = "PAYSTACK" | "FLUTTERWAVE";

interface InitResult {
  authorizationUrl: string;
  reference: string;
}

export function isMockMode(provider: PaymentProvider) {
  if (provider === "PAYSTACK") return !process.env.PAYSTACK_SECRET_KEY;
  return !process.env.FLUTTERWAVE_SECRET_KEY;
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "").replace(/^(?!https?:\/\/)/, "https://");
}

/** Start an online payment. Returns a URL to redirect the payer to. */
export async function initializePayment(params: {
  provider: PaymentProvider;
  amountNaira: number;
  email: string;
  metadata: Record<string, unknown>;
  reference?: string;
}): Promise<InitResult> {
  const reference =
    params.reference ||
    `FS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (isMockMode(params.provider)) {
    return { authorizationUrl: `/pay/${reference}`, reference };
  }

  if (params.provider === "PAYSTACK") {
    const callbackUrl = `${appBaseUrl()}/pay/${reference}?provider=PAYSTACK`;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amountNaira * 100), // kobo
        reference,
        callback_url: callbackUrl,
        metadata: params.metadata,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json?.status) {
      throw new Error(json?.message || "Paystack initialize failed");
    }
    return {
      authorizationUrl: json.data.authorization_url as string,
      reference: (json.data.reference as string) || reference,
    };
  }

  // Flutterwave Standard
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount: params.amountNaira,
      currency: "NGN",
      redirect_url: `${appBaseUrl()}/pay/${reference}?provider=FLUTTERWAVE`,
      customer: { email: params.email },
      meta: params.metadata,
      customizations: {
        title: "Force Schools Fees",
        description: "School fee payment",
      },
    }),
  });
  const json = await res.json();
  if (!res.ok || json?.status !== "success") {
    throw new Error(json?.message || "Flutterwave initialize failed");
  }
  return {
    authorizationUrl: json.data.link as string,
    reference,
  };
}

/** Confirm a payment actually succeeded before trusting it. */
export async function verifyPayment(
  provider: PaymentProvider,
  reference: string
): Promise<{ success: boolean; amountNaira: number }> {
  if (isMockMode(provider)) {
    return { success: true, amountNaira: 0 };
  }

  if (provider === "PAYSTACK") {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    const json = await res.json();
    const ok = json?.data?.status === "success";
    const amountNaira = ok ? (json.data.amount as number) / 100 : 0;
    return { success: ok, amountNaira };
  }

  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      },
    }
  );
  const json = await res.json();
  const ok = json?.data?.status === "successful";
  const amountNaira = ok ? Number(json.data.amount) : 0;
  return { success: ok, amountNaira };
}
