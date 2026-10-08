"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing reset token. Use the link from your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reset failed");
        setLoading(false);
        return;
      }
      router.push("/login?reset=ok");
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md ledger-block space-y-4">
        <h1 className="font-serif text-xl">Choose a new password</h1>
        {error && (
          <p className="text-sm text-brick border border-brick/30 bg-brick/5 px-3 py-2">{error}</p>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 8)"
            className="w-full border border-line px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            className="w-full border border-line px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-paper py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
        <Link href="/login" className="text-xs text-navy underline block text-center">
          ← Sign in
        </Link>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-paper" />}>
      <ResetForm />
    </Suspense>
  );
}
