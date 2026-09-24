"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PayrollRunner() {
  const router = useRouter();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [deductionPercent, setDeductionPercent] = useState(5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, deductionPercent }),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(res.ok ? `Generated ${data.generated} payslip(s) for ${month}.` : data.error);
    router.refresh();
  }

  return (
    <div className="ledger-block flex items-end gap-4 flex-wrap">
      <div>
        <label className="block text-xs font-medium text-ink/70 mb-1">Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-line px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink/70 mb-1">Flat deduction %</label>
        <input type="number" value={deductionPercent} onChange={(e) => setDeductionPercent(Number(e.target.value))} className="border border-line px-3 py-2 text-sm w-24" />
      </div>
      <button onClick={run} disabled={busy} className="bg-navy text-paper text-sm px-5 py-2.5 disabled:opacity-60">
        {busy ? "Running..." : "Run Payroll"}
      </button>
      {message && <span className="text-sm text-sage">{message}</span>}
    </div>
  );
}
