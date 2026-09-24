"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdmissionForm({ arms }: { arms: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not admit student.");
      return;
    }
    router.push(`/students/${data.student.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="ledger-block space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" name="firstName" required />
        <Field label="Last name" name="lastName" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Other names" name="otherNames" />
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">Gender</label>
          <select name="gender" className="w-full border border-line px-3 py-2 text-sm bg-white">
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date of birth" name="dateOfBirth" type="date" />
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">Class / Arm</label>
          <select name="armId" className="w-full border border-line px-3 py-2 text-sm bg-white">
            <option value="">Unassigned for now</option>
            {arms.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>
      <Field label="Home address" name="address" />
      <Field label="Previous school" name="previousSchool" />
      <div>
        <label className="block text-xs font-medium text-ink/70 mb-1">Medical notes</label>
        <textarea name="medicalNotes" rows={2} className="w-full border border-line px-3 py-2 text-sm bg-white" />
      </div>
      {error && <p className="text-sm text-brick">{error}</p>}
      <button type="submit" disabled={submitting} className="bg-navy text-paper text-sm px-5 py-2.5 hover:bg-navy-light disabled:opacity-60">
        {submitting ? "Admitting..." : "Admit Student"}
      </button>
    </form>
  );
}

function Field({ label, name, required, type = "text" }: { label: string; name: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-1">
        {label} {required && <span className="text-brick">*</span>}
      </label>
      <input name={name} type={type} required={required} className="w-full border border-line px-3 py-2 text-sm bg-white" />
    </div>
  );
}
