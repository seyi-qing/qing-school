"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MockCheckoutPage({ params }: { params: { reference: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  async function confirm() {
    setStatus("processing");
    await fetch("/api/fees/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: params.reference }),
    });
    setStatus("done");
    setTimeout(() => router.push("/fees"), 1200);
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="bg-paper max-w-sm w-full p-8 border border-gold/30 text-center">
        <div className="w-10 h-10 border-2 border-gold flex items-center justify-center font-serif text-gold text-sm mx-auto mb-4">FS</div>
        <h1 className="font-serif text-xl mb-2">Simulated Payment Gateway</h1>
        <p className="text-xs text-ink/50 mb-1">Reference</p>
        <p className="font-mono text-sm mb-6">{params.reference}</p>
        <p className="text-xs text-ink/60 mb-6 border-t border-line pt-4">
          No live gateway keys configured. Click below to mark payment successful.
        </p>
        {status !== "done" ? (
          <button onClick={confirm} disabled={status === "processing"} className="w-full bg-sage text-paper py-2.5 text-sm font-medium disabled:opacity-60">
            {status === "processing" ? "Processing..." : "Simulate Successful Payment"}
          </button>
        ) : (
          <p className="text-sage text-sm">Payment confirmed. Redirecting...</p>
        )}
      </div>
    </main>
  );
}
