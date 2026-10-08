"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { SCHOOL } from "@/lib/school-config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [debugPath, setDebugPath] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setDebugPath("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Request failed");
        setLoading(false);
        return;
      }
      setMessage(data.message || "If that account exists, instructions were sent.");
      if (data.debugResetPath) setDebugPath(data.debugResetPath);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md ledger-block space-y-4">
        <h1 className="font-serif text-xl text-ink">Reset password</h1>
        <p className="text-sm text-ink/60">
          Enter the email for your {SCHOOL.shortName} portal account.
        </p>
        {error && (
          <p className="text-sm text-brick border border-brick/30 bg-brick/5 px-3 py-2">{error}</p>
        )}
        {message && (
          <p className="text-sm text-navy border border-navy/20 bg-navy/5 px-3 py-2">{message}</p>
        )}
        {debugPath && (
          <p className="text-xs break-all">
            Debug link:{" "}
            <Link href={debugPath} className="text-navy underline">
              {debugPath}
            </Link>
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.ng"
            className="w-full border border-line px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-paper py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <Link href="/login" className="text-xs text-navy underline block text-center">
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
