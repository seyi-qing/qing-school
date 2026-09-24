"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CollectPaymentForm({ invoiceId, maxAmount }: { invoiceId: string; maxAmount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(maxAmount);
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-navy underline text-sm hover:text-gold">
        Collect
      </button>
    );
  }

  async function submit() {
    setSubmitting(true);
    await fetch("/api/fees/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, amount, method }),
    });
    setSubmitting(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        max={maxAmount}
        className="w-24 border border-line px-2 py-1 text-xs"
      />
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as "CASH" | "BANK_TRANSFER")}
        className="border border-line px-1 py-1 text-xs"
      >
        <option value="CASH">Cash</option>
        <option value="BANK_TRANSFER">Bank</option>
      </select>
      <button
        onClick={submit}
        disabled={submitting}
        className="bg-sage text-paper text-xs px-2 py-1 disabled:opacity-60"
      >
        {submitting ? "..." : "OK"}
      </button>
    </div>
  );
}
