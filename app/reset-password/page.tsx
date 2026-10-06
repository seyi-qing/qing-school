"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setMessage("Passwords do not match."); return; }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(data.message || data.error || "Unable to reset password.");
    setLoading(false);
    if (res.ok) window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <form onSubmit={submit} className="ledger-block w-full max-w-md space-y-4">
        <h1 className="font-serif text-2xl text-ink">Choose a new password</h1>
        <p className="text-xs text-ink/60">Use at least 10 characters with upper/lowercase letters, a number and a symbol.</p>
        <input type="password" required minLength={10} autoComplete="new-password" value={password}
          onChange={e => setPassword(e.target.value)} className="w-full border border-line bg-white px-3 py-2.5 text-sm" />
        <input type="password" required minLength={10} autoComplete="new-password" value={confirm}
          onChange={e => setConfirm(e.target.value)} className="w-full border border-line bg-white px-3 py-2.5 text-sm" placeholder="Confirm password" />
        <button disabled={loading || !token} className="w-full bg-navy text-paper py-2.5 disabled:opacity-60">
          {loading ? "Updating…" : "Reset password"}
        </button>
        {message && <p className="text-sm text-ink/70">{message}</p>}
      </form>
    </main>
  );
}
