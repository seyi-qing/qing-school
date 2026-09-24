"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StaffForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add staff member.");
      return;
    }
    setCreated({ email: payload.email as string, password: data.defaultPassword });
  }

  if (created) {
    return (
      <div className="ledger-block">
        <h2 className="font-serif text-lg mb-2">Staff account created</h2>
        <p className="text-sm mb-4">Share these login details securely:</p>
        <p className="text-sm font-mono bg-line/30 p-3 mb-4">{created.email}<br />{created.password}</p>
        <div className="flex gap-3">
          <button onClick={() => router.push("/staff")} className="bg-navy text-paper text-sm px-4 py-2">Back to Staff</button>
          <button onClick={() => setCreated(null)} className="border border-navy text-navy text-sm px-4 py-2">Add another</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="ledger-block space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" name="firstName" required />
        <Field label="Last name" name="lastName" required />
      </div>
      <Field label="Email (used to log in)" name="email" type="email" required />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">Category</label>
          <select name="category" className="w-full border border-line px-3 py-2 text-sm bg-white">
            <option value="TEACHING">Teaching</option>
            <option value="NON_TEACHING">Non-teaching</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">Login role</label>
          <select name="role" className="w-full border border-line px-3 py-2 text-sm bg-white">
            <option value="TEACHER">Teacher</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="SECRETARY">Secretary</option>
            <option value="IT">IT</option>
            <option value="PRINCIPAL">Principal</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>
      <Field label="Designation" name="designation" />
      <Field label="Phone" name="phone" />
      <Field label="Monthly salary" name="monthlySalary" type="number" />
      {error && <p className="text-sm text-brick">{error}</p>}
      <button type="submit" disabled={submitting} className="bg-navy text-paper text-sm px-5 py-2.5 disabled:opacity-60">
        {submitting ? "Saving..." : "Add Staff"}
      </button>
    </form>
  );
}

function Field({ label, name, required, type = "text" }: { label: string; name: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-1">{label} {required && <span className="text-brick">*</span>}</label>
      <input name={name} type={type} required={required} className="w-full border border-line px-3 py-2 text-sm bg-white" />
    </div>
  );
}
