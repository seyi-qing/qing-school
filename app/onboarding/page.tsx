"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function OnboardingPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ slug: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolName: fd.get("schoolName"),
        shortName: fd.get("shortName"),
        slug: String(fd.get("slug") || "").toLowerCase().replace(/\s+/g, "-"),
        adminEmail: fd.get("adminEmail"),
        adminPassword: fd.get("adminPassword"),
        adminName: fd.get("adminName"),
        phone: fd.get("phone") || undefined,
        address: fd.get("address") || undefined,
        plan: fd.get("plan") || "STARTER",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create school");
      return;
    }
    setDone({ slug: data.slug });
  }

  if (done) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full ledger-block text-center space-y-4">
          <h1 className="font-serif text-2xl">Your school is ready</h1>
          <p className="text-sm text-ink/70">
            Tenant <span className="font-mono text-navy">{done.slug}</span> created. Sign in as admin.
          </p>
          <Link href="/login" className="inline-block bg-navy text-paper px-6 py-2.5 text-sm">Go to login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">School ERP · Multi-tenant</p>
        <h1 className="font-serif text-3xl mb-2">Onboard your school</h1>
        <p className="text-sm text-ink/60 mb-6">
          Isolated workspace with its own admin, branding, and data. KMS and other schools stay separate.
        </p>
        <form onSubmit={submit} className="ledger-block space-y-3 text-sm">
          <label className="block">School full name
            <input name="schoolName" required className="mt-1 w-full border border-line px-3 py-2" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">Short name
              <input name="shortName" required placeholder="KMS" maxLength={12} className="mt-1 w-full border border-line px-3 py-2" />
            </label>
            <label className="block">URL slug
              <input name="slug" required placeholder="my-school" pattern="[a-z0-9\-]+" className="mt-1 w-full border border-line px-3 py-2 font-mono text-xs" />
            </label>
          </div>
          <label className="block">Plan
            <select name="plan" className="mt-1 w-full border border-line px-3 py-2 bg-white">
              <option value="STARTER">Starter (~300 students)</option>
              <option value="PRO">Pro (~1,500)</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </label>
          <label className="block">Admin full name
            <input name="adminName" required className="mt-1 w-full border border-line px-3 py-2" />
          </label>
          <label className="block">Admin email
            <input name="adminEmail" type="email" required className="mt-1 w-full border border-line px-3 py-2" />
          </label>
          <label className="block">Admin password (10+ chars, mixed)
            <input name="adminPassword" type="password" required minLength={10} className="mt-1 w-full border border-line px-3 py-2" />
          </label>
          <label className="block">Phone (optional)
            <input name="phone" className="mt-1 w-full border border-line px-3 py-2" />
          </label>
          <label className="block">Address (optional)
            <input name="address" className="mt-1 w-full border border-line px-3 py-2" />
          </label>
          {error && <p className="text-brick text-sm">{error}</p>}
          <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2.5 disabled:opacity-50">
            {busy ? "Creating school..." : "Create school workspace"}
          </button>
        </form>
        <p className="text-center text-xs text-ink/40 mt-4">
          Already have an account? <Link href="/login" className="underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
