/**
 * Payment Gateway Integration (Paystack / Flutterwave)
 * Mock mode by default when keys are unset.
 */
export type PaymentProvider = "PAYSTACK" | "FLUTTERWAVE";

interface InitResult {
  authorizationUrl: string;
  reference: string;
}

function isMockMode(provider: PaymentProvider) {
  if (provider === "PAYSTACK") return !process.env.PAYSTACK_SECRET_KEY;
  return !process.env.FLUTTERWAVE_SECRET_KEY;
}

export async function initializePayment(params: {
  provider: PaymentProvider;
  amountNaira: number;
  email: string;
  metadata: Record<string, unknown>;
}): Promise<InitResult> {
  const reference = `FS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (isMockMode(params.provider)) {
    return { authorizationUrl: `/pay/${reference}`, reference };
  }

  if (params.provider === "PAYSTACK") {
    throw new Error("Paystack live mode not yet implemented -- see TODO in lib/integrations/payments.ts");
  }

  throw new Error("Flutterwave live mode not yet implemented -- see TODO in lib/integrations/payments.ts");
}

export async function verifyPayment(
  provider: PaymentProvider,
  reference: string
): Promise<{ success: boolean; amountNaira: number }> {
  if (isMockMode(provider)) {
    return { success: true, amountNaira: 0 };
  }
  throw new Error("Live verification not yet implemented -- see TODO in lib/integrations/payments.ts");
}
