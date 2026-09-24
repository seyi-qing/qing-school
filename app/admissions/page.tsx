"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function AdmissionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ admissionNumber: string; message: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
        setLoading(false);
        return;
      }
      setDone({ admissionNumber: data.admissionNumber, message: data.message });
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="bg-navy text-paper px-4 sm:px-8 py-5 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg">
          Force Schools
        </Link>
        <Link href="/login" className="text-sm border border-gold px-3 py-1 hover:bg-gold hover:text-navy">
          Portal Login
        </Link>
      </header>

      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="font-serif text-3xl mb-2">Online Admission</h1>
        <p className="text-sm text-ink/60 mb-8">
          Submit an application for the current session. The office will review and contact you.
        </p>

        {done ? (
          <div className="ledger-block space-y-3">
            <p className="text-sage font-medium">Application received</p>
            <p className="text-sm">{done.message}</p>
            <p className="font-serif text-2xl">{done.admissionNumber}</p>
            <p className="text-xs text-ink/50">Save this number for follow-up.</p>
            <Link href="/" className="inline-block text-sm text-navy underline mt-2">
              Back to homepage
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="ledger-block space-y-4">
            {error && (
              <p className="text-sm text-brick border border-brick/30 px-3 py-2">{error}</p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <Field name="firstName" label="First name" required />
              <Field name="lastName" label="Last name" required />
            </div>
            <Field name="otherNames" label="Other names" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase text-ink/50 mb-1">Gender</label>
                <select name="gender" className="w-full border border-line bg-white px-3 py-2.5 text-sm">
                  <option value="">—</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <Field name="dateOfBirth" label="Date of birth" type="date" />
            </div>
            <Field name="address" label="Home address" />
            <Field name="previousSchool" label="Previous school" />
            <Field name="desiredClass" label="Class applying for (e.g. JSS1)" />
            <hr className="border-line" />
            <p className="text-xs uppercase tracking-wide text-ink/50">Parent / Guardian</p>
            <Field name="parentName" label="Full name" required />
            <Field name="parentPhone" label="Phone" required />
            <Field name="parentEmail" label="Email" type="email" />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-paper py-2.5 text-sm hover:bg-navy-light disabled:opacity-60"
            >
              {loading ? "Submitting…" : "Submit application"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  required,
  type = "text",
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs uppercase text-ink/50 mb-1" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full border border-line bg-white px-3 py-2.5 text-sm focus:border-navy outline-none"
      />
    </div>
  );
}
