"use client";

import { useState } from "react";

export function PayOnlineButton({
  invoiceId,
  maxAmount,
  defaultEmail = "",
}: {
  invoiceId: string;
  maxAmount: number;
  defaultEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(maxAmount);
  const [email, setEmail] = useState(defaultEmail);
  const [provider, setProvider] = useState<"PAYSTACK" | "FLUTTERWAVE">("PAYSTACK");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (maxAmount <= 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-navy underline text-sm hover:text-gold"
      >
        Pay online
      </button>
    );
  }

  async function start() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate_online",
          invoiceId,
          amount,
          provider,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start payment");
        setLoading(false);
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-xs border border-line p-2 bg-white min-w-[12rem]">
      <input
        type="email"
        placeholder="Email for receipt"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border border-line px-2 py-1"
        required
      />
      <input
        type="number"
        value={amount}
        max={maxAmount}
        min={1}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="border border-line px-2 py-1"
      />
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as "PAYSTACK" | "FLUTTERWAVE")}
        className="border border-line px-2 py-1"
      >
        <option value="PAYSTACK">Paystack</option>
        <option value="FLUTTERWAVE">Flutterwave</option>
      </select>
      {error && <p className="text-brick">{error}</p>}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={start}
          disabled={loading || !email}
          className="bg-navy text-paper px-2 py-1 disabled:opacity-60"
        >
          {loading ? "…" : "Continue"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="border border-line px-2 py-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
