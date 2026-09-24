"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@forceschools.test" },
  { role: "IT", email: "it@forceschools.test" },
  { role: "Secretary", email: "secretary@forceschools.test" },
  { role: "Principal", email: "principal@forceschools.test" },
  { role: "Accountant", email: "accountant@forceschools.test" },
  { role: "Teacher", email: "teacher@forceschools.test" },
  { role: "Student", email: "student@forceschools.test" },
  { role: "Parent", email: "parent@forceschools.test" },
];
const DEMO_PASSWORD = "Password123!";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push(data.redirectTo);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 border border-gold/30 bg-paper">
        <div className="bg-navy-dark text-paper p-10 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 border-2 border-gold flex items-center justify-center font-serif text-gold text-lg mb-6">FS</div>
            <h1 className="font-serif text-3xl leading-tight">Force Schools<br />Management System</h1>
            <p className="mt-4 text-paper/70 text-sm leading-relaxed max-w-xs">
              One register for admissions, attendance, results and fees.
            </p>
          </div>
          <p className="text-xs text-paper/40 mt-10">2025/2026 Academic Session</p>
        </div>
        <div className="p-10">
          <h2 className="font-serif text-2xl mb-1">Sign in</h2>
          <p className="text-sm text-ink/60 mb-6">Enter your portal credentials.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Email address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-line bg-white px-3 py-2 text-sm focus:border-navy outline-none" placeholder="you@forceschools.test" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-line bg-white px-3 py-2 text-sm focus:border-navy outline-none" placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-brick border border-brick/30 bg-brick/5 px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-navy text-paper py-2.5 text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-8 border-t border-line pt-4">
            <p className="text-xs font-medium text-ink/60 mb-2">Demo accounts (password: <code className="bg-line/50 px-1">{DEMO_PASSWORD}</code>)</p>
            <div className="grid grid-cols-2 gap-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <button key={acc.email} type="button" onClick={() => { setEmail(acc.email); setPassword(DEMO_PASSWORD); }} className="text-left text-xs px-2 py-1 border border-line hover:border-gold hover:bg-gold/5">
                  <span className="font-medium">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
