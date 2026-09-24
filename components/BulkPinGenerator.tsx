"use client";

import { useState } from "react";

export function BulkPinGenerator({
  terms,
}: {
  terms: Array<{ id: string; name: string; sessionName: string; isCurrent: boolean }>;
}) {
  const [termId, setTermId] = useState(terms.find((t) => t.isCurrent)?.id || terms[0]?.id || "");
  const [count, setCount] = useState(50);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/result-pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termId, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
      } else {
        setMsg(`Created ${data.created} PIN(s) for this term.`);
      }
    } catch {
      setMsg("Network error");
    }
    setLoading(false);
  }

  if (terms.length === 0) {
    return <p className="text-sm text-ink/50">Create a session/term first.</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="block text-xs uppercase text-ink/50 mb-1">Term</label>
        <select
          value={termId}
          onChange={(e) => setTermId(e.target.value)}
          className="w-full border border-line bg-white px-3 py-2"
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.sessionName} — {t.name}
              {t.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs uppercase text-ink/50 mb-1">How many PINs</label>
        <input
          type="number"
          min={1}
          max={500}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full border border-line bg-white px-3 py-2"
        />
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={loading || !termId}
        className="bg-navy text-paper px-4 py-2 text-sm hover:bg-navy-light disabled:opacity-60"
      >
        {loading ? "Generating…" : "Generate PINs"}
      </button>
      {msg && <p className="text-xs text-ink/70">{msg}</p>}
      <p className="text-xs text-ink/40">
        Parents use admission number + PIN on the public Result Checker. Sell or issue PINs offline.
      </p>
    </div>
  );
}
