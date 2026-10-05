"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

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
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newClass, setNewClass] = useState({ name: "", order: 0 });
  const [newArm, setNewArm] = useState({ schoolClassId: "", name: "" });
  const [newSubject, setNewSubject] = useState({ subjectName: "", code: "" });
  const [assign, setAssign] = useState({ armId: "", subjectId: "" });
  const [promote, setPromote] = useState({ fromArmId: "", toArmId: "" });

  const allArms = classes.flatMap((c) =>
    c.arms.map((a) => ({ ...a, className: c.name }))
  );

  async function post(body: object) {
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function addClass() {
    if (!newClass.name.trim()) return;
    setBusy(true);
    const { ok, data } = await post(newClass);
    setBusy(false);
    if (!ok) {
      toast(data.error || "Failed to add class", "error");
      return;
    }
    toast("Class added", "success");
    setNewClass({ name: "", order: 0 });
    router.refresh();
  }

  async function addArm() {
    if (!newArm.schoolClassId || !newArm.name.trim()) return;
    setBusy(true);
    const { ok, data } = await post(newArm);
    setBusy(false);
    if (!ok) {
      toast(data.error || "Failed to add arm", "error");
      return;
    }
    toast("Arm added", "success");
    setNewArm({ schoolClassId: "", name: "" });
    router.refresh();
  }

  async function addSubject() {
    if (!newSubject.subjectName.trim()) return;
    setBusy(true);
    const { ok, data } = await post({
      subjectName: newSubject.subjectName.trim(),
      code: newSubject.code.trim() || undefined,
    });
    setBusy(false);
    if (!ok) {
      toast(data.error || "Failed to add subject", "error");
      return;
    }
    toast(`Subject "${data.subject?.name || newSubject.subjectName}" added`, "success");
    setNewSubject({ subjectName: "", code: "" });
    router.refresh();
  }

  async function assignSubject() {
    if (!assign.armId || !assign.subjectId) return;
    setBusy(true);
    const { ok, data } = await post(assign);
    setBusy(false);
    if (!ok) {
      toast(data.error || "Failed to assign subject", "error");
      return;
    }
    toast("Subject assigned to arm (available for scores)", "success");
    setAssign({ armId: "", subjectId: "" });
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
    if (res.ok) {
      toast(`Promoted ${data.promoted} students`, "success");
      setMessage(`Promoted ${data.promoted} students.`);
    } else {
      toast(data.error || "Promotion failed", "error");
      setMessage(data.error);
    }
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
        <div className="ledger-block">
          <h3 className="font-serif text-lg mb-2">Subjects catalogue</h3>
          {subjects.length === 0 ? (
            <p className="text-sm text-ink/50">No subjects yet. Add English, Maths, etc. on the right.</p>
          ) : (
            <ul className="text-sm grid sm:grid-cols-2 gap-1">
              {subjects.map((s) => (
                <li key={s.id} className="border border-line px-2 py-1.5">
                  {s.name}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink/50 mt-3">
            After adding a subject, <strong>assign it to an arm</strong> so teachers can enter scores for that class.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="ledger-block">
          <h3 className="font-serif mb-2">Add Subject</h3>
          <input
            value={newSubject.subjectName}
            onChange={(e) => setNewSubject((s) => ({ ...s, subjectName: e.target.value }))}
            placeholder="e.g. English Language"
            className="w-full border border-line px-3 py-2 text-sm mb-2"
          />
          <input
            value={newSubject.code}
            onChange={(e) => setNewSubject((s) => ({ ...s, code: e.target.value }))}
            placeholder="Code (optional) e.g. ENG"
            className="w-full border border-line px-3 py-2 text-sm mb-2"
          />
          <button
            type="button"
            onClick={addSubject}
            disabled={busy || !newSubject.subjectName.trim()}
            className="bg-navy text-paper text-sm px-4 py-2 w-full disabled:opacity-50"
          >
            Add subject
          </button>
        </div>

        <div className="ledger-block">
          <h3 className="font-serif mb-2">Assign subject to arm</h3>
          <select
            value={assign.armId}
            onChange={(e) => setAssign((s) => ({ ...s, armId: e.target.value }))}
            className="w-full border border-line px-3 py-2 text-sm mb-2"
          >
            <option value="">Select arm...</option>
            {allArms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.className} {a.name}
              </option>
            ))}
          </select>
          <select
            value={assign.subjectId}
            onChange={(e) => setAssign((s) => ({ ...s, subjectId: e.target.value }))}
            className="w-full border border-line px-3 py-2 text-sm mb-2"
          >
            <option value="">Select subject...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={assignSubject}
            disabled={busy || !assign.armId || !assign.subjectId}
            className="bg-navy text-paper text-sm px-4 py-2 w-full disabled:opacity-50"
          >
            Assign to arm
          </button>
        </div>

        <div className="ledger-block">
          <h3 className="font-serif mb-2">Add Class</h3>
          <input
            value={newClass.name}
            onChange={(e) => setNewClass((s) => ({ ...s, name: e.target.value }))}
            placeholder="e.g. JSS 1"
            className="w-full border border-line px-3 py-2 text-sm mb-2"
          />
          <button
            type="button"
            onClick={addClass}
            disabled={busy}
            className="bg-navy text-paper text-sm px-4 py-2 w-full disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="ledger-block">
          <h3 className="font-serif mb-2">Add Arm</h3>
          <select
            value={newArm.schoolClassId}
            onChange={(e) => setNewArm((s) => ({ ...s, schoolClassId: e.target.value }))}
            className="w-full border border-line px-3 py-2 text-sm mb-2"
          >
            <option value="">Select class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={newArm.name}
            onChange={(e) => setNewArm((s) => ({ ...s, name: e.target.value }))}
            placeholder="e.g. Diamond"
            className="w-full border border-line px-3 py-2 text-sm mb-2"
          />
          <button
            type="button"
            onClick={addArm}
            disabled={busy}
            className="bg-navy text-paper text-sm px-4 py-2 w-full disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="ledger-block">
          <h3 className="font-serif mb-2">Promote Class (1-click)</h3>
          <select
            value={promote.fromArmId}
            onChange={(e) => setPromote((s) => ({ ...s, fromArmId: e.target.value }))}
            className="w-full border border-line px-3 py-2 text-sm mb-2"
          >
            <option value="">From arm...</option>
            {allArms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.className} {a.name} ({a.studentCount})
              </option>
            ))}
          </select>
          <select
            value={promote.toArmId}
            onChange={(e) => setPromote((s) => ({ ...s, toArmId: e.target.value }))}
            className="w-full border border-line px-3 py-2 text-sm mb-2"
          >
            <option value="">To arm...</option>
            {allArms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.className} {a.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={runPromotion}
            disabled={busy}
            className="bg-gold-dark text-paper text-sm px-4 py-2 w-full disabled:opacity-50"
          >
            Promote All Active Students
          </button>
          {message && <p className="text-xs text-sage mt-2">{message}</p>}
        </div>
      </div>
    </div>
  );
}
