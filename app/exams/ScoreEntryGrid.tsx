"use client";

import { useState } from "react";

interface Row {
  id: string;
  name: string;
  ca1: number;
  ca2: number;
  exam: number;
}

const CA1_MAX = 20;
const CA2_MAX = 20;
const EXAM_MAX = 60;

export function ScoreEntryGrid({
  armSubjectId,
  termId,
  students,
}: {
  armSubjectId: string;
  termId: string;
  students: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(students);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  function update(id: string, field: "ca1" | "ca2" | "exam", value: number) {
    setMsg("");
    setOk(false);
    const max = field === "exam" ? EXAM_MAX : field === "ca1" ? CA1_MAX : CA2_MAX;
    const clamped = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: clamped } : r)));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    setOk(false);
    const res = await fetch("/api/exams/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        armSubjectId,
        termId,
        scores: rows.map((r) => ({
          studentId: r.id,
          ca1: r.ca1,
          ca2: r.ca2,
          exam: r.exam,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "Save failed");
      return;
    }
    setOk(true);
    setMsg(`Saved and graded ${data.count ?? rows.length} student(s).`);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/50">
        Continuous assessment: CA1 / {CA1_MAX} + CA2 / {CA2_MAX} + Exam / {EXAM_MAX} = 100. Totals
        auto-grade using school grade bands.
      </p>
      <div className="ledger-block !p-0 overflow-x-auto">
        <table className="ledger">
          <thead>
            <tr>
              <th>Student</th>
              <th>CA1 (/{CA1_MAX})</th>
              <th>CA2 (/{CA2_MAX})</th>
              <th>Exam (/{EXAM_MAX})</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const total = r.ca1 + r.ca2 + r.exam;
              return (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  {(["ca1", "ca2", "exam"] as const).map((field) => (
                    <td key={field}>
                      <input
                        type="number"
                        min={0}
                        max={field === "exam" ? EXAM_MAX : field === "ca1" ? CA1_MAX : CA2_MAX}
                        value={r[field]}
                        onChange={(e) => update(r.id, field, Number(e.target.value))}
                        className="w-16 border border-line px-2 py-1 text-sm"
                      />
                    </td>
                  ))}
                  <td className={`font-medium ${total > 100 ? "text-brick" : ""}`}>{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-4 flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-navy text-paper text-sm px-5 py-2.5 hover:bg-navy-light disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Scores"}
          </button>
          {msg && <span className={`text-sm ${ok ? "text-sage" : "text-brick"}`}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
