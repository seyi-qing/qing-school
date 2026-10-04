"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

type Slot = {
  id: string;
  dayOfWeek: number;
  period: number;
  armSubjectId: string;
  subjectName: string;
};

type ArmOpt = {
  id: string;
  label: string;
  subjects: { armSubjectId: string; name: string }[];
};

export function TimetableEditor({
  arms,
  selectedArmId,
  slots,
  canEdit,
}: {
  arms: ArmOpt[];
  selectedArmId: string;
  slots: Slot[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const arm = arms.find((a) => a.id === selectedArmId) || arms[0];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);

  function cell(day: number, period: number) {
    return slots.find((s) => s.dayOfWeek === day && s.period === period);
  }

  async function assign(day: number, period: number, armSubjectId: string, force = false) {
    if (!canEdit || !armSubjectId) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        armId: arm.id,
        armSubjectId,
        dayOfWeek: day,
        period,
        force,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.status === 409) {
      const detail = data.message || "Teacher is already booked at this period.";
      const proceed = window.confirm(
        `${detail}\n\nAssign anyway? (not recommended - creates a real conflict)`
      );
      if (proceed) {
        await assign(day, period, armSubjectId, true);
      } else {
        setMsgOk(false);
        setMsg(detail);
        router.refresh();
      }
      return;
    }

    if (!res.ok) {
      setMsgOk(false);
      setMsg(data.error || "Could not assign period");
      return;
    }

    if (data.conflicts?.length) {
      setMsgOk(false);
      setMsg(
        `Saved with conflict: ${data.conflicts[0].teacherName} also teaches ${data.conflicts[0].armLabel} this period.`
      );
    } else {
      setMsgOk(true);
      setMsg("Period assigned.");
    }
    router.refresh();
  }

  async function clearSlot(id: string) {
    if (!canEdit) return;
    setBusy(true);
    setMsg("");
    await fetch(`/api/timetable?id=${id}`, { method: "DELETE" });
    setBusy(false);
    setMsgOk(true);
    setMsg("Period cleared.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs uppercase text-ink/50">Class / Arm</label>
        <select
          className="border border-line bg-white px-3 py-2 text-sm"
          value={arm?.id}
          onChange={(e) => {
            router.push(`/timetable?armId=${e.target.value}`);
          }}
          disabled={busy}
        >
          {arms.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        {!canEdit && (
          <span className="text-xs text-ink/40">View only - Admin/IT can edit</span>
        )}
      </div>

      {msg && <p className={`text-sm ${msgOk ? "text-sage" : "text-brick"}`}>{msg}</p>}

      <p className="text-xs text-ink/50">
        Conflict check: assigning a subject whose teacher is already teaching another class at the
        same day/period will warn you before saving.
      </p>

      <div className="ledger-block !p-0 overflow-x-auto">
        <table className="ledger text-xs sm:text-sm">
          <thead>
            <tr>
              <th>Period</th>
              {DAYS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p}>
                <td className="font-medium">{p}</td>
                {DAYS.map((_, day) => {
                  const s = cell(day, p);
                  return (
                    <td key={day} className="min-w-[7rem] align-top">
                      {s ? (
                        <div className="space-y-1">
                          <div className="font-medium">{s.subjectName}</div>
                          {canEdit && (
                            <button
                              type="button"
                              className="text-brick text-[10px] underline"
                              onClick={() => clearSlot(s.id)}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      ) : canEdit ? (
                        <select
                          className="w-full border border-line bg-white text-xs py-1"
                          defaultValue=""
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v) assign(day, p, v);
                            e.target.value = "";
                          }}
                          disabled={busy || !arm?.subjects.length}
                        >
                          <option value="">-</option>
                          {arm?.subjects.map((sub) => (
                            <option key={sub.armSubjectId} value={sub.armSubjectId}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-ink/30">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {arm && arm.subjects.length === 0 && (
        <p className="text-xs text-ink/50">
          Link subjects (and teachers) to this arm under Classes before building the timetable.
        </p>
      )}
    </div>
  );
}
