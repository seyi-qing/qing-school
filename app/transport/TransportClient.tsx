"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Route = {
  id: string;
  name: string;
  vehicle: string | null;
  driverName: string | null;
  driverPhone: string | null;
  feeLabel: string;
  riders: { id: string; studentName: string; admissionNumber: string }[];
};

export function TransportClient({
  routes,
  students,
}: {
  routes: Route[];
  students: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function addRoute(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/transport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        vehicle: fd.get("vehicle") || undefined,
        driverName: fd.get("driverName") || undefined,
        driverPhone: fd.get("driverPhone") || undefined,
        feeAmount: fd.get("feeAmount") || 0,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function enroll(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/transport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: fd.get("routeId"),
        studentId: fd.get("studentId"),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function unenroll(enrollmentId: string) {
    if (!confirm("Remove student from this route?")) return;
    setBusy(true);
    await fetch("/api/transport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unenroll", enrollmentId }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {msg && <p className="text-sm text-brick">{msg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Add route</h2>
          <form onSubmit={addRoute} className="space-y-2 text-sm">
            <input name="name" required placeholder="Route name (e.g. Ikeja – School)" className="w-full border border-line px-3 py-2" />
            <input name="vehicle" placeholder="Vehicle plate / bus no." className="w-full border border-line px-3 py-2" />
            <input name="driverName" placeholder="Driver name" className="w-full border border-line px-3 py-2" />
            <input name="driverPhone" placeholder="Driver phone" className="w-full border border-line px-3 py-2" />
            <input name="feeAmount" type="number" min={0} step="0.01" placeholder="Termly fee (NGN)" className="w-full border border-line px-3 py-2" />
            <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
              {busy ? "…" : "Create route"}
            </button>
          </form>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Enroll student</h2>
          <form onSubmit={enroll} className="space-y-2 text-sm">
            <select name="routeId" required className="w-full border border-line px-3 py-2 bg-white">
              <option value="">Select route</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.riders.length} riders)
                </option>
              ))}
            </select>
            <select name="studentId" required className="w-full border border-line px-3 py-2 bg-white">
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
              {busy ? "…" : "Enroll"}
            </button>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {routes.map((r) => (
          <section key={r.id} className="ledger-block">
            <h3 className="font-serif text-base mb-1">{r.name}</h3>
            <p className="text-xs text-ink/50 mb-3">
              {r.vehicle ?? "No vehicle"}
              {r.driverName ? ` · ${r.driverName}` : ""}
              {r.driverPhone ? ` · ${r.driverPhone}` : ""}
              {` · Fee ${r.feeLabel}`}
            </p>
            <ul className="text-sm space-y-2">
              {r.riders.map((x) => (
                <li key={x.id} className="flex justify-between gap-2 border-b border-line pb-2">
                  <div>
                    {x.studentName}
                    <span className="text-xs text-ink/50 block">{x.admissionNumber}</span>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => unenroll(x.id)}
                    className="text-xs text-brick underline shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
              {r.riders.length === 0 && <li className="text-ink/40 text-xs">No riders yet</li>}
            </ul>
          </section>
        ))}
        {routes.length === 0 && <p className="text-sm text-ink/50">No routes yet. Add one above.</p>}
      </div>
    </div>
  );
}
