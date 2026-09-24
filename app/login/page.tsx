"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only honour ?next= for staff-style paths; portal roles always use API redirectTo
  const nextParam = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      // Prefer server role home (student → /portal/student, etc.)
      const dest = data.redirectTo || nextParam || "/dashboard";
      router.push(dest);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 border-2 border-gold items-center justify-center font-serif text-gold text-lg mb-3">
            FS
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">Force Schools</h1>
          <p className="text-sm text-ink/60 mt-1">Portal sign in</p>
        </div>

        <form onSubmit={onSubmit} className="ledger-block space-y-4">
          {error && (
            <p className="text-sm text-brick border border-brick/30 bg-brick/5 px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs uppercase tracking-wide text-ink/50 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line bg-white px-3 py-2.5 text-sm focus:border-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-ink/50 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line bg-white px-3 py-2.5 text-sm focus:border-navy outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-paper py-2.5 text-sm hover:bg-navy-light disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-ink/40 mt-6">
          <a href="/" className="hover:text-gold">
            &larr; Back to public site
          </a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-paper" />}>
      <LoginForm />
    </Suspense>
  );
}
