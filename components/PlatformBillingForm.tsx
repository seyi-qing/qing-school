"use client";

import { useState } from "react";

type SchoolOpt = { id: string; name: string; slug: string; plan: string };

export function PlatformBillingForm({ schools }: { schools: SchoolOpt[] }) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id || "");
  const [plan, setPlan] = useState<"STARTER" | "PRO" | "ENTERPRISE">("PRO");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/platform/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", schoolId, plan, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
        return;
      }
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      setMsg(data.message || "Plan applied (mock or manual).");
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function setPlanOnly() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/platform/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
        return;
      }
      setMsg(`Limits set: ${data.school.plan} / max ${data.school.maxStudents} students`);
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!schools.length) return null;

  return (
    <form onSubmit={subscribe} className="ledger-block space-y-3 text-sm">
      <h2 className="font-serif text-lg">Subscribe school (Paystack)</h2>
      <p className="text-ink/60 text-xs">
        Live mode needs PAYSTACK_SECRET_KEY + PAYSTACK_PLAN_STARTER / _PRO / _ENTERPRISE plan codes.
        Without keys, plan limits still apply in mock mode.
      </p>
      <label className="block">
        <span className="text-xs text-ink/50">School</span>
        <select
          className="w-full border border-line px-3 py-2 mt-1"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
        >
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.slug}) — {s.plan}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-ink/50">Plan</span>
        <select
          className="w-full border border-line px-3 py-2 mt-1"
          value={plan}
          onChange={(e) => setPlan(e.target.value as typeof plan)}
        >
          <option value="STARTER">STARTER — 300 students</option>
          <option value="PRO">PRO — 1,500 students</option>
          <option value="ENTERPRISE">ENTERPRISE — 10,000 students</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-ink/50">Billing email</span>
        <input
          type="email"
          required
          className="w-full border border-line px-3 py-2 mt-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@school.ng"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-navy text-paper px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Working…" : "Start subscription"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={setPlanOnly}
          className="border border-navy text-navy px-4 py-2 disabled:opacity-60"
        >
          Set limits only (no charge)
        </button>
      </div>
      {msg && <p className="text-xs text-ink/70">{msg}</p>}
    </form>
  );
}
