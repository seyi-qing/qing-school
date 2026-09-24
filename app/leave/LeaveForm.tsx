"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LeaveForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fd.entries())),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        setLoading(false);
        return;
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      {error && <p className="text-brick text-xs">{error}</p>}
      <div>
        <label className="block text-xs uppercase text-ink/50 mb-1">From</label>
        <input name="startDate" type="date" required className="w-full border border-line px-3 py-2" />
      </div>
      <div>
        <label className="block text-xs uppercase text-ink/50 mb-1">To</label>
        <input name="endDate" type="date" required className="w-full border border-line px-3 py-2" />
      </div>
      <div>
        <label className="block text-xs uppercase text-ink/50 mb-1">Reason</label>
        <textarea name="reason" required rows={3} className="w-full border border-line px-3 py-2" />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-navy text-paper py-2 disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
