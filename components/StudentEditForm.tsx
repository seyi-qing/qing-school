"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ArmOption = { id: string; label: string };

type Props = {
  studentId: string;
  arms: ArmOption[];
  initial: {
    firstName: string;
    lastName: string;
    otherNames: string;
    gender: string;
    address: string;
    previousSchool: string;
    medicalNotes: string;
    guardianPhone: string;
    armId: string;
    status: string;
  };
};

export function StudentEditForm({ studentId, arms, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setOk(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(false);

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      otherNames: form.otherNames.trim() || undefined,
      gender: form.gender || undefined,
      address: form.address.trim() || undefined,
      previousSchool: form.previousSchool.trim() || undefined,
      medicalNotes: form.medicalNotes.trim() || undefined,
      guardianPhone: form.guardianPhone.trim() || undefined,
      armId: form.armId || null,
      status: form.status,
    };

    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save changes.");
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="ledger-block space-y-3">
      <h2 className="font-serif text-lg">Edit student / assign class</h2>
      <p className="text-xs text-ink/55">
        Assign an unassigned student to a class arm, or update bio details.
      </p>

      {error && (
        <p className="text-sm text-brick border border-brick/30 bg-brick/5 px-3 py-2">{error}</p>
      )}
      {ok && (
        <p className="text-sm text-sage border border-sage/30 bg-sage/5 px-3 py-2">Saved.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="First name"
          value={form.firstName}
          onChange={(v) => set("firstName", v)}
          required
        />
        <Field label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} required />
        <Field label="Other names" value={form.otherNames} onChange={(v) => set("otherNames", v)} />
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
            className="w-full border border-line px-3 py-2 text-sm bg-white"
          >
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink/70 mb-1">Class / Arm</label>
          <select
            value={form.armId}
            onChange={(e) => set("armId", e.target.value)}
            className="w-full border border-line px-3 py-2 text-sm bg-white"
          >
            <option value="">Unassigned</option>
            {arms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="w-full border border-line px-3 py-2 text-sm bg-white"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="APPLIED">APPLIED</option>
            <option value="WITHDRAWN">WITHDRAWN</option>
            <option value="GRADUATED">GRADUATED</option>
          </select>
        </div>
        <Field label="Address" value={form.address} onChange={(v) => set("address", v)} />
        <Field
          label="Previous school"
          value={form.previousSchool}
          onChange={(v) => set("previousSchool", v)}
        />
        <Field
          label="Guardian phone"
          value={form.guardianPhone}
          onChange={(v) => set("guardianPhone", v)}
        />
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink/70 mb-1">Medical / notes</label>
          <textarea
            value={form.medicalNotes}
            onChange={(e) => set("medicalNotes", e.target.value)}
            rows={2}
            className="w-full border border-line px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-navy text-paper text-sm px-5 py-2.5 hover:bg-navy-light disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-line px-3 py-2 text-sm bg-white"
      />
    </div>
  );
}
