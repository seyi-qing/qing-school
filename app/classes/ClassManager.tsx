"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClassView {
  id: string;
  name: string;
  arms: { id: string; name: string; studentCount: number }[];
}

export function ClassManager({
  classes,
  subjects,
}: {
  classes: ClassView[];
  subjects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newClass, setNewClass] = useState({ name: "", order: 0 });
  const [newArm, setNewArm] = useState({ schoolClassId: "", name: "" });
  const [promote, setPromote] = useState({ fromArmId: "", toArmId: "" });

  const allArms = classes.flatMap((c) =>
    c.arms.map((a) => ({ ...a, className: c.name }))
  );

  async function addClass() {
    setBusy(true);
    await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClass),
    });
    setBusy(false);
    setNewClass({ name: "", order: 0 });
    router.refresh();
  }

  async function addArm() {
    setBusy(true);
    await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newArm),
    });
    setBusy(false);
    setNewArm({ schoolClassId: "", name: "" });
    router.refresh();
  }

  async function runPromotion() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/classes/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promote),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(res.ok ? `Promoted ${data.promoted} students.` : data.error);
    router.refresh();
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        {classes.map((c) => (
          <div key={c.id} className="ledger-block">
            <h3 className="font-serif text-lg mb-2">{c.name}</h3>
            <ul className="text-sm space-y-1">
              {c.arms.map((a) => (
                <li key={a.id} className="flex justify-between">
                  <span>Arm {a.name}</span>
                  <span className="text-ink/50">{a.studentCount} students</span>
                </li>
              ))}
              {c.arms.length === 0 && <li className="text-ink/50">No arms yet.</li>}
            </ul>
          </div>
        ))}
        {classes.length === 0 && <p className="text-ink/50">No classes yet.</p>}
        {subjects.length > 0 && (
          <div className="ledger-block">
            <h3 className="font-serif text-lg mb-2">Subjects</h3>
            <p className="text-sm text-ink/70">{subjects.map((s) => s.name).join(", ")}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="ledger-block">
          <h3 className="font-serif mb-2">Add Class</h3>
          <input value={newClass.name} onChange={(e) => setNewClass((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. JSS 1" className="w-full border border-line px-3 py-2 text-sm mb-2" />
          <button onClick={addClass} disabled={busy} className="bg-navy text-paper text-sm px-4 py-2 w-full">Add</button>
        </div>
        <div className="ledger-block">
          <h3 className="font-serif mb-2">Add Arm</h3>
          <select value={newArm.schoolClassId} onChange={(e) => setNewArm((s) => ({ ...s, schoolClassId: e.target.value }))} className="w-full border border-line px-3 py-2 text-sm mb-2">
            <option value="">Select class...</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={newArm.name} onChange={(e) => setNewArm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Diamond" className="w-full border border-line px-3 py-2 text-sm mb-2" />
          <button onClick={addArm} disabled={busy} className="bg-navy text-paper text-sm px-4 py-2 w-full">Add</button>
        </div>
        <div className="ledger-block">
          <h3 className="font-serif mb-2">Promote Class (1-click)</h3>
          <select value={promote.fromArmId} onChange={(e) => setPromote((s) => ({ ...s, fromArmId: e.target.value }))} className="w-full border border-line px-3 py-2 text-sm mb-2">
            <option value="">From arm...</option>
            {allArms.map((a) => <option key={a.id} value={a.id}>{a.className} {a.name} ({a.studentCount})</option>)}
          </select>
          <select value={promote.toArmId} onChange={(e) => setPromote((s) => ({ ...s, toArmId: e.target.value }))} className="w-full border border-line px-3 py-2 text-sm mb-2">
            <option value="">To arm...</option>
            {allArms.map((a) => <option key={a.id} value={a.id}>{a.className} {a.name}</option>)}
          </select>
          <button onClick={runPromotion} disabled={busy} className="bg-gold-dark text-paper text-sm px-4 py-2 w-full">Promote All Active Students</button>
          {message && <p className="text-xs text-sage mt-2">{message}</p>}
        </div>
      </div>
    </div>
  );
}
