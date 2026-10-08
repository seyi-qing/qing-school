"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { SCHOOL } from "@/lib/school-config";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const { toast } = useToast();

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
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (typeof data.error === "string" && data.error) ||
          (res.status === 503
            ? "Server configuration error. Check Vercel env (DATABASE_URL, SESSION_SECRET)."
            : res.status === 429
              ? "Too many attempts. Wait and try again."
              : `Login failed (${res.status}).`);
        setError(msg);
        toast(msg, "error");
        setLoading(false);
        return;
      }
      toast("Signed in.", "success");
      const dest = data.redirectTo || nextParam || "/dashboard";
      router.push(dest);
      router.refresh();
    } catch {
      const msg = "Network error. Try again.";
      setError(msg);
      toast(msg, "error");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt={SCHOOL.name}
            className="w-20 h-20 object-contain mx-auto mb-3"
          />
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">{SCHOOL.name}</h1>
          <p className="text-sm text-ink/60 mt-1">
            Portal sign in · {SCHOOL.motto}
          </p>
        </div>

        <form onSubmit={onSubmit} className="ledger-block space-y-4">
          {error && (
            <p className="text-sm text-brick border border-brick/30 bg-brick/5 px-3 py-2 whitespace-pre-wrap">
              {error}
            </p>
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
              placeholder="admin@kms.sch.ng"
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
          <p className="text-right text-xs">
            <Link href="/account/forgot-password" className="text-navy underline hover:text-gold">
              Forgot password?
            </Link>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-paper py-2.5 text-sm font-medium hover:bg-navy-light disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-ink/50 mt-6">
          <Link href="/" className="underline hover:text-navy">
            ← Back to {SCHOOL.shortName} home
          </Link>
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
