"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Utilities",
  "Maintenance",
  "Stationery",
  "Salaries",
  "Transport",
  "Feeding",
  "Security",
  "Other",
];

export function ExpenseForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        <label className="block text-xs uppercase text-ink/50 mb-1">Category</label>
        <select name="category" required className="w-full border border-line bg-white px-3 py-2">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs uppercase text-ink/50 mb-1">Description</label>
        <input
          name="description"
          required
          className="w-full border border-line bg-white px-3 py-2"
          placeholder="e.g. NEPA bill March"
        />
      </div>
      <div>
        <label className="block text-xs uppercase text-ink/50 mb-1">Amount (₦)</label>
        <input
          name="amount"
          type="number"
          min={1}
          step="0.01"
          required
          className="w-full border border-line bg-white px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-xs uppercase text-ink/50 mb-1">Date</label>
        <input
          name="date"
          type="date"
          className="w-full border border-line bg-white px-3 py-2"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-navy text-paper py-2 hover:bg-navy-light disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}
