"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

/**
 * Payment return / mock checkout page.
 * Live Paystack redirects here after payment; mock mode confirms locally.
 */
export default function PayReferencePage() {
  const params = useParams();
  const search = useSearchParams();
  const reference = String(params.reference || "");
  const provider = (search.get("provider") || "PAYSTACK") as "PAYSTACK" | "FLUTTERWAVE";

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function confirm() {
    setStatus("loading");
    try {
      const res = await fetch("/api/fees/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, provider }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("err");
        setMessage(data.error || "Could not confirm payment");
        return;
      }
      setStatus("ok");
      setMessage(
        data.alreadyApplied
          ? "This payment was already recorded. Thank you."
          : "Payment confirmed. The school has updated the invoice."
      );
    } catch {
      setStatus("err");
      setMessage("Network error");
    }
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="ledger-block max-w-md w-full space-y-4 text-center">
        <h1 className="font-serif text-2xl">Fee Payment</h1>
        <p className="text-sm text-ink/60 break-all">Reference: {reference}</p>

        {status === "idle" && (
          <>
            <p className="text-sm">
              If you completed payment with the gateway, tap confirm below. In demo mode this
              simulates a successful charge.
            </p>
            <button
              type="button"
              onClick={confirm}
              className="w-full bg-navy text-paper py-2.5 text-sm hover:bg-navy-light"
            >
              Confirm payment
            </button>
          </>
        )}
        {status === "loading" && <p className="text-sm">Verifying…</p>}
        {status === "ok" && <p className="text-sm text-sage">{message}</p>}
        {status === "err" && <p className="text-sm text-brick">{message}</p>}

        <Link href="/" className="block text-sm text-navy underline">
          Back to site
        </Link>
      </div>
    </main>
  );
}
