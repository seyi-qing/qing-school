"use client";

import { useState } from "react";

export function FeeReminderButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function send() {
    if (
      !confirm(
        "Send fee reminder SMS to all students with unpaid balances (where a phone number is on file)?"
      )
    )
      return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/fees/reminders", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error || "Failed");
      } else {
        setResult(
          `Debtors: ${data.debtors}. Sent: ${data.sent}. Skipped (no phone / failed): ${data.skippedNoPhoneOrFailed}.`
        );
      }
    } catch {
      setResult("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={send}
        disabled={loading}
        className="border border-navy text-navy px-3 py-1.5 hover:bg-navy hover:text-paper disabled:opacity-60"
      >
        {loading ? "Sending…" : "SMS fee reminders"}
      </button>
      {result && <p className="text-xs text-ink/60 mt-2 max-w-md">{result}</p>}
    </div>
  );
}
