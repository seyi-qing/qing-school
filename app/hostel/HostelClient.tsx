"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Room = {
  id: string;
  name: string;
  block: string | null;
  capacity: number;
  gender: string | null;
  occupied: number;
  allocations: {
    id: string;
    bedLabel: string | null;
    studentName: string;
    admissionNumber: string;
  }[];
};

export function HostelClient({
  rooms,
  students,
}: {
  rooms: Room[];
  students: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function addRoom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/hostel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        block: fd.get("block") || undefined,
        capacity: fd.get("capacity"),
        gender: fd.get("gender") || undefined,
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

  async function saveRoom(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/hostel", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: fd.get("name"),
        block: fd.get("block") || null,
        capacity: fd.get("capacity"),
        gender: fd.get("gender") || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed to update room");
      return;
    }
    setMsg("Room updated.");
    setEditingId(null);
    router.refresh();
  }

  async function deleteRoom(id: string, name: string) {
    if (!confirm(`Delete room “${name}”? Only if empty.`)) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/hostel", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not delete");
      return;
    }
    setMsg("Room deleted.");
    setEditingId(null);
    router.refresh();
  }

  async function allocate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/hostel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: fd.get("roomId"),
        studentId: fd.get("studentId"),
        bedLabel: fd.get("bedLabel") || undefined,
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

  async function vacate(allocationId: string) {
    if (!confirm("Vacate this bed?")) return;
    setBusy(true);
    await fetch("/api/hostel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vacate", allocationId }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`text-sm ${msg.includes("updated") || msg.includes("deleted") ? "text-sage" : "text-brick"}`}>
          {msg}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Add room</h2>
          <form onSubmit={addRoom} className="space-y-2 text-sm">
            <input name="name" required placeholder="Room name" className="w-full border border-line px-3 py-2" />
            <input name="block" placeholder="Block (optional)" className="w-full border border-line px-3 py-2" />
            <input name="capacity" type="number" min={1} max={50} defaultValue={4} className="w-full border border-line px-3 py-2" />
            <select name="gender" className="w-full border border-line px-3 py-2 bg-white">
              <option value="">Any gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
              {busy ? "…" : "Create room"}
            </button>
          </form>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Allocate bed</h2>
          <form onSubmit={allocate} className="space-y-2 text-sm">
            <select name="roomId" required className="w-full border border-line px-3 py-2 bg-white">
              <option value="">Select room</option>
              {rooms
                .filter((r) => r.occupied < r.capacity)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.block ? `${r.block} / ` : ""}
                    {r.name} ({r.occupied}/{r.capacity})
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
            <input name="bedLabel" placeholder="Bed label (optional)" className="w-full border border-line px-3 py-2" />
            <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
              {busy ? "…" : "Allocate"}
            </button>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((r) => (
          <section key={r.id} className="ledger-block space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-serif text-base">
                  {r.block ? `${r.block} · ` : ""}
                  {r.name}
                </h3>
                <span className="text-xs text-ink/50">
                  {r.occupied}/{r.capacity}
                  {r.gender ? ` · ${r.gender}` : ""}
                </span>
              </div>
              <div className="flex gap-2 text-xs">
                <button type="button" className="underline text-navy" onClick={() => setEditingId(editingId === r.id ? null : r.id)}>
                  {editingId === r.id ? "Cancel" : "Edit"}
                </button>
                <button type="button" className="underline text-brick" disabled={busy} onClick={() => deleteRoom(r.id, r.name)}>
                  Delete
                </button>
              </div>
            </div>

            {editingId === r.id && (
              <form onSubmit={(e) => saveRoom(e, r.id)} className="space-y-2 text-sm border border-navy/20 bg-navy/5 p-3">
                <input name="name" required defaultValue={r.name} className="w-full border border-line px-3 py-2 bg-white" />
                <input name="block" defaultValue={r.block ?? ""} placeholder="Block" className="w-full border border-line px-3 py-2 bg-white" />
                <input name="capacity" type="number" min={1} max={50} defaultValue={r.capacity} className="w-full border border-line px-3 py-2 bg-white" />
                <select name="gender" defaultValue={r.gender ?? ""} className="w-full border border-line px-3 py-2 bg-white">
                  <option value="">Any gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
                  {busy ? "Saving…" : "Save room"}
                </button>
              </form>
            )}

            <ul className="text-sm space-y-2">
              {r.allocations.map((a) => (
                <li key={a.id} className="flex justify-between gap-2 border-b border-line pb-2">
                  <div>
                    {a.studentName}
                    <span className="text-xs text-ink/50 block">{a.admissionNumber}</span>
                    {a.bedLabel && <span className="text-xs text-ink/40">Bed {a.bedLabel}</span>}
                  </div>
                  <button type="button" disabled={busy} onClick={() => vacate(a.id)} className="text-xs text-brick underline shrink-0">
                    Vacate
                  </button>
                </li>
              ))}
              {r.allocations.length === 0 && <li className="text-ink/40 text-xs">Empty</li>}
            </ul>
          </section>
        ))}
        {rooms.length === 0 && <p className="text-sm text-ink/50">No rooms yet. Add one above.</p>}
      </div>
    </div>
  );
}
