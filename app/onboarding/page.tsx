"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      schoolName: fd.get("schoolName"),
      shortName: fd.get("shortName"),
      slug: fd.get("slug"),
      plan: fd.get("plan") || "STARTER",
      adminName: fd.get("adminName"),
      adminEmail: fd.get("adminEmail"),
      adminPassword: fd.get("adminPassword"),
      phone: fd.get("phone") || undefined,
      address: fd.get("address") || undefined,
    };
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create school");
      return;
    }
    router.push(data.redirectTo || "/login");
  }

  return (
    <main className="min-h-screen bg-paper text-ink px-4 py-10">
      <div className="max-w-lg mx-auto">
        <p className="text-xs tracking-widest uppercase text-ink/40 mb-2">School ERP · Multi-tenant</p>
        <h1 className="font-serif text-3xl text-navy mb-2">Onboard your school</h1>
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
        <p className="text-center text-xs text-ink/50 mt-4 space-x-3">
          <Link href="/platform" className="underline text-navy">Platform</Link>
          <span>·</span>
          <Link href="/dashboard" className="underline text-navy">Dashboard</Link>
          <span>·</span>
          <Link href="/login" className="underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
