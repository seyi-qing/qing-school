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
  const [notifyParents, setNotifyParents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function handleSave() {
    setSaving(true);
    setMsg("");
    setOk(false);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        armId,
        date,
        notifyParents,
        marks: students.map((s) => ({ studentId: s.id, status: marks[s.id] })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "Save failed");
      return;
    }
    setOk(true);
    const absent = data.absent ?? 0;
    const sms = data.smsSent ?? 0;
    const skip = data.smsSkipped ?? 0;
    setMsg(
      notifyParents && absent > 0
        ? `Saved. ${absent} absent. Parent SMS: ${sms} sent, ${skip} skipped (no phone / failed).`
        : `Saved for ${date}.`
    );
  }

  function markAll(status: Status) {
    setMarks(Object.fromEntries(students.map((s) => [s.id, status])));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <button
          type="button"
          onClick={() => markAll("PRESENT")}
          className="border border-line px-3 py-1.5 hover:bg-navy/5"
        >
          Mark all present
        </button>
        <label className="flex items-center gap-2 text-xs text-ink/70 ml-auto">
          <input
            type="checkbox"
            checked={notifyParents}
            onChange={(e) => setNotifyParents(e.target.checked)}
          />
          SMS parents of absent students
        </label>
      </div>

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
              <tr key={s.id} className={marks[s.id] === "ABSENT" ? "bg-brick/5" : undefined}>
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
        <div className="p-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-navy text-paper text-sm px-5 py-2.5 hover:bg-navy-light disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Attendance"}
          </button>
          {msg && <span className={`text-sm ${ok ? "text-sage" : "text-brick"}`}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
