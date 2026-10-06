"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(data.message || data.error || "If an account exists, reset instructions have been sent.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <form onSubmit={submit} className="ledger-block w-full max-w-md space-y-4">
        <h1 className="font-serif text-2xl text-ink">Reset password</h1>
        <p className="text-sm text-ink/60">Enter your account email. If it exists, we’ll send a one-time reset link.</p>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border border-line bg-white px-3 py-2.5 text-sm" placeholder="you@example.com" />
        <button disabled={loading} className="w-full bg-navy text-paper py-2.5 disabled:opacity-60">
          {loading ? "Sending…" : "Send reset link"}
        </button>
        {message && <p className="text-sm text-ink/70">{message}</p>}
        <Link href="/login" className="text-xs underline">← Back to sign in</Link>
      </form>
    </main>
  );
}
