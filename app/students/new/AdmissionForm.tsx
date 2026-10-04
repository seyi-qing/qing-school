"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Dup = {
  id: string;
  admissionNumber: string;
  name: string;
  status: string;
  class: string;
};

export function AdmissionForm({ arms }: { arms: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Dup[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);

  async function submit(payload: Record<string, unknown>, forceAdmit = false) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, forceAdmit }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (res.status === 409 && data.code === "DUPLICATE_NAME") {
      setDuplicates(data.duplicates || []);
      setPendingPayload(payload);
      setError(data.error);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Could not admit student.");
      return;
    }
    router.push(`/students/${data.student.id}`);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDuplicates([]);
    setPendingPayload(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    await submit(payload, false);
  }

  return (
    <form onSubmit={handleSubmit} className="ledger-block space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First name" name="firstName" required />
        <Field label="Last name" name="lastName" required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date of birth" name="dateOfBirth" type="date" />
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">Class / Arm</label>
          <select name="armId" className="w-full border border-line px-3 py-2 text-sm bg-white">
            <option value="">Unassigned for now</option>
            {arms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Field label="Guardian phone" name="guardianPhone" placeholder="0803..." />
      <Field label="Home address" name="address" />
      <Field label="Previous school" name="previousSchool" />
      <div>
        <label className="block text-xs font-medium text-ink/70 mb-1">Medical notes</label>
        <textarea name="medicalNotes" rows={2} className="w-full border border-line px-3 py-2 text-sm bg-white" />
      </div>

      {error && <p className="text-sm text-brick">{error}</p>}

      {duplicates.length > 0 && (
        <div className="border border-brick/40 bg-brick/5 p-3 text-sm space-y-2">
          <p className="font-medium">Existing records with the same name:</p>
          <ul className="space-y-1">
            {duplicates.map((d) => (
              <li key={d.id}>
                <a href={`/students/${d.id}`} className="underline text-navy">
                  {d.admissionNumber}
                </a>{" "}
                — {d.name} · {d.status} · {d.class}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={submitting || !pendingPayload}
            onClick={() => pendingPayload && submit(pendingPayload, true)}
            className="border border-brick text-brick text-xs px-3 py-1.5"
          >
            Admit anyway (create another record)
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-navy text-paper text-sm px-5 py-2.5 hover:bg-navy-light disabled:opacity-60"
      >
        {submitting ? "Admitting..." : "Admit Student"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-1">
        {label} {required && <span className="text-brick">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full border border-line px-3 py-2 text-sm bg-white"
      />
    </div>
  );
}
