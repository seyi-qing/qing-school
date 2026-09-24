"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ComplaintsPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/complaints", {
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
      setDone(data.message);
      (e.target as HTMLFormElement).reset();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="bg-navy text-paper px-4 sm:px-8 py-5 flex justify-between">
        <Link href="/" className="font-serif text-lg">
          Force Schools
        </Link>
        <Link href="/login" className="text-sm border border-gold px-3 py-1">
          Portal
        </Link>
      </header>
      <div className="max-w-lg mx-auto px-4 py-10">
        <h1 className="font-serif text-3xl mb-2">Complaint / Feedback</h1>
        <p className="text-sm text-ink/60 mb-6">
          Share a concern or suggestion with the school office. This is not for emergencies.
        </p>
        {done ? (
          <div className="ledger-block text-sage text-sm">{done}</div>
        ) : (
          <form onSubmit={onSubmit} className="ledger-block space-y-3">
            {error && <p className="text-brick text-sm">{error}</p>}
            <input name="name" required placeholder="Your name" className="w-full border border-line px-3 py-2 text-sm" />
            <input
              name="contact"
              required
              placeholder="Phone or email"
              className="w-full border border-line px-3 py-2 text-sm"
            />
            <input name="subject" required placeholder="Subject" className="w-full border border-line px-3 py-2 text-sm" />
            <textarea
              name="message"
              required
              rows={5}
              placeholder="Message"
              className="w-full border border-line px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-paper py-2.5 text-sm disabled:opacity-60"
            >
              {loading ? "Sending…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
