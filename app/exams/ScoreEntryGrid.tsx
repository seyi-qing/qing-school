"use client";

import { useState } from "react";

interface Row {
  id: string;
  name: string;
  ca1: number;
  ca2: number;
  exam: number;
}

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
  const [saved, setSaved] = useState(false);

  function update(id: string, field: "ca1" | "ca2" | "exam", value: number) {
    setSaved(false);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function save() {
    setSaving(true);
    await fetch("/api/exams/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        armSubjectId,
        termId,
        scores: rows.map((r) => ({ studentId: r.id, ca1: r.ca1, ca2: r.ca2, exam: r.exam })),
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="ledger-block !p-0 overflow-x-auto">
      <table className="ledger">
        <thead>
          <tr>
            <th>Student</th>
            <th>CA1 (max 20)</th>
            <th>CA2 (max 20)</th>
            <th>Exam (max 60)</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              {(["ca1", "ca2", "exam"] as const).map((field) => (
                <td key={field}>
                  <input
                    type="number"
                    min={0}
                    max={field === "exam" ? 60 : 20}
                    value={r[field]}
                    onChange={(e) => update(r.id, field, Number(e.target.value))}
                    className="w-16 border border-line px-2 py-1 text-sm"
                  />
                </td>
              ))}
              <td className="font-medium">{r.ca1 + r.ca2 + r.exam}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-4 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-navy text-paper text-sm px-5 py-2.5 hover:bg-navy-light disabled:opacity-60">
          {saving ? "Saving..." : "Save Scores"}
        </button>
        {saved && <span className="text-sage text-sm">Scores saved and graded.</span>}
      </div>
    </div>
  );
}
