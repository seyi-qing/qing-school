"use client";

import { useState } from "react";

export function FeeReminderButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function send() {
    if (!confirm("Send SMS fee reminders to parents/students with unpaid balances?")) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/fees/reminders", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setMsg(res.ok ? data.message || "Reminders queued" : data.error || "Failed");
    } catch {
      setMsg("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={send}
        disabled={loading}
        className="text-xs sm:text-sm border border-line px-3 py-1.5 hover:border-navy whitespace-nowrap disabled:opacity-60"
      >
        {loading ? "Sending…" : "SMS fee reminders"}
      </button>
      {msg && <span className="text-[10px] text-ink/50 max-w-[12rem]">{msg}</span>}
    </div>
  );
}
