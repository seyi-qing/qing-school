"use client";

import { useState } from "react";

type Status = "PRESENT" | "ABSENT" | "LATE";

export function AttendanceForm({
  armId,
  date,
  students,
}: {
  armId: string;
  date: string;
  students: { id: string; name: string; status: Status }[];
}) {
  const [marks, setMarks] = useState<Record<string, Status>>(
    Object.fromEntries(students.map((s) => [s.id, s.status]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        armId,
        date,
        marks: students.map((s) => ({ studentId: s.id, status: marks[s.id] })),
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
            <th>Present</th>
            <th>Late</th>
            <th>Absent</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              {(["PRESENT", "LATE", "ABSENT"] as Status[]).map((opt) => (
                <td key={opt}>
                  <input
                    type="radio"
                    name={`status-${s.id}`}
                    checked={marks[s.id] === opt}
                    onChange={() => setMarks((m) => ({ ...m, [s.id]: opt }))}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-navy text-paper text-sm px-5 py-2.5 hover:bg-navy-light disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Attendance"}
        </button>
        {saved && <span className="text-sage text-sm">Saved for {date}.</span>}
      </div>
    </div>
  );
}
