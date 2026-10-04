"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GradeAttemptForm({
  attemptId,
  currentScore,
  currentTotal,
}: {
  attemptId: string;
  currentScore: number;
  currentTotal: number;
}) {
  const router = useRouter();
  const [score, setScore] = useState(String(currentScore));
  const [total, setTotal] = useState(String(currentTotal));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "gradeAttempt",
        attemptId,
        score: Number(score),
        total: Number(total),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg("Saved");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs">
        Score
        <input
          type="number"
          step="0.5"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="block border border-line px-2 py-1 w-20"
        />
      </label>
      <label className="text-xs">
        Total
        <input
          type="number"
          step="0.5"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          className="block border border-line px-2 py-1 w-20"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="bg-navy text-paper text-xs px-3 py-1.5 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save grade"}
      </button>
      {msg && <span className="text-xs text-sage">{msg}</span>}
    </div>
  );
}
