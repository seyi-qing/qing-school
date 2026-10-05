"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type Arm = { id: string; label: string };
type Student = { id: string; name: string; admissionNumber: string; unassigned: boolean };

export function BulkAssignClass({ arms, students }: { arms: Arm[]; students: Student[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [armId, setArmId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectUnassigned() {
    setSelected(new Set(students.filter((s) => s.unassigned).map((s) => s.id)));
  }

  async function assign() {
    if (selected.size === 0) {
      setMsg("Select at least one student.");
      toast("Select at least one student.", "error");
      return;
    }
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/students/bulk-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds: Array.from(selected),
        armId: armId || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const err = data.error || "Assign failed";
      setMsg(err);
      toast(err, "error");
      return;
    }
    const ok = `Updated ${data.updated} student(s).`;
    setMsg(ok);
    toast(ok, "success");
    setSelected(new Set());
    router.refresh();
  }

  const unassignedCount = students.filter((s) => s.unassigned).length;
  if (unassignedCount === 0 && students.length === 0) return null;

  return (
    <div className="ledger-block space-y-3 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Bulk assign class
          {unassignedCount > 0 && (
            <span className="text-ink/50 font-normal"> · {unassignedCount} unassigned</span>
          )}
        </p>
        <button type="button" onClick={selectUnassigned} className="text-xs text-navy underline">
          Select all unassigned
        </button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={armId}
          onChange={(e) => setArmId(e.target.value)}
          className="border border-line px-3 py-2 text-sm bg-white min-w-[10rem]"
        >
          <option value="">Unassigned</option>
          {arms.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={assign}
          className="bg-navy text-paper text-sm px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Saving…" : `Assign (${selected.size})`}
        </button>
      </div>
      {msg && <p className="text-sm text-ink/70">{msg}</p>}
      <ul className="max-h-40 overflow-y-auto text-sm border border-line divide-y divide-line">
        {students.slice(0, 80).map((s) => (
          <li key={s.id} className="flex items-center gap-2 px-2 py-1.5">
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => toggle(s.id)}
            />
            <span className="font-mono text-xs text-ink/50">{s.admissionNumber}</span>
            <span className="flex-1 truncate">{s.name}</span>
            {s.unassigned && <span className="text-[10px] text-brick">Unassigned</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
