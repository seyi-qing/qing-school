"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({
  firstName,
  lastName,
  phone,
  designation,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  designation: string;
}) {
  const router = useRouter();
  const [fn, setFn] = useState(firstName);
  const [ln, setLn] = useState(lastName);
  const [ph, setPh] = useState(phone);
  const [des, setDes] = useState(designation);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: fn.trim(),
        lastName: ln.trim(),
        phone: ph.trim() || null,
        designation: des.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Could not save");
      return;
    }
    setMsg("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="ledger-block space-y-3 text-sm">
      <h2 className="font-serif text-base">Staff details</h2>
      {err && <p className="text-brick text-sm">{err}</p>}
      {msg && <p className="text-sage text-sm">{msg}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          First name
          <input
            value={fn}
            onChange={(e) => setFn(e.target.value)}
            required
            className="mt-1 w-full border border-line px-3 py-2"
          />
        </label>
        <label className="block">
          Last name
          <input
            value={ln}
            onChange={(e) => setLn(e.target.value)}
            required
            className="mt-1 w-full border border-line px-3 py-2"
          />
        </label>
      </div>
      <label className="block">
        Phone
        <input
          value={ph}
          onChange={(e) => setPh(e.target.value)}
          className="mt-1 w-full border border-line px-3 py-2"
        />
      </label>
      <label className="block">
        Designation
        <input
          value={des}
          onChange={(e) => setDes(e.target.value)}
          className="mt-1 w-full border border-line px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="bg-navy text-paper px-4 py-2 text-sm disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
