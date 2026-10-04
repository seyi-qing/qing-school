"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Route = {
  id: string;
  name: string;
  vehicle: string | null;
  driverName: string | null;
  driverPhone: string | null;
  feeAmount: number;
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
  const [editingId, setEditingId] = useState<string | null>(null);

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
      setMsg(data.error || "Failed to create route");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function saveRoute(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/transport", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: fd.get("name"),
        vehicle: fd.get("vehicle") || null,
        driverName: fd.get("driverName") || null,
        driverPhone: fd.get("driverPhone") || null,
        feeAmount: fd.get("feeAmount") || 0,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed to update route");
      return;
    }
    setMsg("Route updated.");
    setEditingId(null);
    router.refresh();
  }

  async function deleteRoute(id: string, name: string) {
    if (!confirm(`Delete route “${name}”? Only allowed if there are no active riders.`)) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/transport", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not delete route");
      return;
    }
    setMsg("Route deleted.");
    setEditingId(null);
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
      setMsg(data.error || "Failed to enroll");
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

  async function billFee(enrollmentId: string) {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/transport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createFeeInvoice", enrollmentId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not create invoice");
      return;
    }
    setMsg("Transport fee invoice created.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p
          className={`text-sm px-3 py-2 border ${
            msg.includes("updated") || msg.includes("created") || msg.includes("deleted")
              ? "text-sage border-sage/30 bg-sage/5"
              : "text-brick border-brick/30 bg-brick/5"
          }`}
        >
          {msg}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Add route</h2>
          <form onSubmit={addRoute} className="space-y-2 text-sm">
            <input name="name" required placeholder="Route name (e.g. Sango – Ifo)" className="w-full border border-line px-3 py-2" />
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
          <section key={r.id} className="ledger-block space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-serif text-base">{r.name}</h3>
                <p className="text-xs text-ink/50 mt-0.5">
                  {r.vehicle ?? "No vehicle"}
                  {r.driverName ? ` · ${r.driverName}` : ""}
                  {r.driverPhone ? ` · ${r.driverPhone}` : ""}
                  {` · Fee ${r.feeLabel}`}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="underline text-navy"
                  onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                >
                  {editingId === r.id ? "Cancel" : "Edit route"}
                </button>
                <button
                  type="button"
                  className="underline text-brick"
                  disabled={busy}
                  onClick={() => deleteRoute(r.id, r.name)}
                >
                  Delete
                </button>
              </div>
            </div>

            {editingId === r.id && (
              <form
                onSubmit={(e) => saveRoute(e, r.id)}
                className="space-y-2 text-sm border border-navy/20 bg-navy/5 p-3"
              >
                <p className="text-xs font-medium text-navy uppercase tracking-wide">Edit route / driver</p>
                <label className="block text-xs text-ink/60">
                  Route name
                  <input
                    name="name"
                    required
                    defaultValue={r.name}
                    className="mt-0.5 w-full border border-line px-3 py-2 bg-white"
                  />
                </label>
                <label className="block text-xs text-ink/60">
                  Vehicle plate / bus no.
                  <input
                    name="vehicle"
                    defaultValue={r.vehicle ?? ""}
                    className="mt-0.5 w-full border border-line px-3 py-2 bg-white"
                  />
                </label>
                <label className="block text-xs text-ink/60">
                  Driver name
                  <input
                    name="driverName"
                    defaultValue={r.driverName ?? ""}
                    className="mt-0.5 w-full border border-line px-3 py-2 bg-white"
                  />
                </label>
                <label className="block text-xs text-ink/60">
                  Driver phone
                  <input
                    name="driverPhone"
                    defaultValue={r.driverPhone ?? ""}
                    className="mt-0.5 w-full border border-line px-3 py-2 bg-white"
                  />
                </label>
                <label className="block text-xs text-ink/60">
                  Termly fee (NGN)
                  <input
                    name="feeAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={r.feeAmount}
                    className="mt-0.5 w-full border border-line px-3 py-2 bg-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-navy text-paper py-2 disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </form>
            )}

            <ul className="text-sm space-y-2">
              {r.riders.map((x) => (
                <li key={x.id} className="flex justify-between gap-2 border-b border-line pb-2">
                  <div>
                    {x.studentName}
                    <span className="text-xs text-ink/50 block">{x.admissionNumber}</span>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => billFee(x.id)}
                      className="text-xs text-navy underline"
                    >
                      Bill fee
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => unenroll(x.id)}
                      className="text-xs text-brick underline"
                    >
                      Remove
                    </button>
                  </div>
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
