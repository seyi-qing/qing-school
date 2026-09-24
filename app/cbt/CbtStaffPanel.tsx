"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Exam = {
  id: string;
  title: string;
  durationMinutes: number;
  isOpen: boolean;
  questionCount: number;
  attemptCount: number;
};

type BankItem = {
  id: string;
  prompt: string;
  type: string;
  subjectTag: string | null;
  marks: number;
};

export function CbtStaffPanel({ exams }: { exams: Exam[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [examId, setExamId] = useState(exams[0]?.id || "");
  const [qType, setQType] = useState<"MCQ" | "ESSAY">("MCQ");
  const [bank, setBank] = useState<BankItem[]>([]);

  useEffect(() => {
    fetch("/api/cbt?bank=1")
      .then((r) => r.json())
      .then((d) => setBank(d.bank || []))
      .catch(() => undefined);
  }, []);

  async function createExam(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        durationMinutes: fd.get("durationMinutes"),
        negativeMark: fd.get("negativeMark") || 0,
        proctoring: fd.get("proctoring") === "on",
      }),
    });
    setBusy(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function addQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const options =
      qType === "MCQ"
        ? [fd.get("opt0"), fd.get("opt1"), fd.get("opt2"), fd.get("opt3")].filter(Boolean)
        : [];
    const res = await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: fd.get("examId"),
        prompt: fd.get("prompt"),
        type: qType,
        options,
        correctIndex: Number(fd.get("correctIndex") || 0),
        marks: fd.get("marks") || 1,
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

  async function saveBank(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const type = String(fd.get("type") || "MCQ") as "MCQ" | "ESSAY";
    const options =
      type === "MCQ"
        ? [fd.get("opt0"), fd.get("opt1"), fd.get("opt2"), fd.get("opt3")].filter(Boolean)
        : [];
    await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bank",
        prompt: fd.get("prompt"),
        type,
        options,
        correctIndex: Number(fd.get("correctIndex") || 0),
        subjectTag: fd.get("subjectTag") || undefined,
        marks: fd.get("marks") || 1,
      }),
    });
    setBusy(false);
    (e.target as HTMLFormElement).reset();
    const d = await fetch("/api/cbt?bank=1").then((r) => r.json());
    setBank(d.bank || []);
  }

  async function importBank(bankId: string) {
    if (!examId) {
      setMsg("Select an exam first");
      return;
    }
    setBusy(true);
    await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "importBank", examId, bankId }),
    });
    setBusy(false);
    router.refresh();
  }

  async function toggle(id: string) {
    await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleExamId: id }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={createExam} className="ledger-block space-y-2 text-sm">
          <h2 className="font-serif text-lg">New exam</h2>
          <input name="title" required placeholder="Title" className="w-full border border-line px-3 py-2" />
          <input name="durationMinutes" type="number" defaultValue={30} min={5} className="w-full border border-line px-3 py-2" />
          <input
            name="negativeMark"
            type="number"
            step="0.1"
            min={0}
            max={1}
            defaultValue={0}
            placeholder="Negative mark factor (0–1)"
            className="w-full border border-line px-3 py-2"
          />
          <label className="flex gap-2 items-center text-xs">
            <input type="checkbox" name="proctoring" defaultChecked />
            Enable proctoring (tab/window leave + fullscreen request)
          </label>
          <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
            Create
          </button>
        </form>

        <form onSubmit={addQuestion} className="ledger-block space-y-2 text-sm">
          <h2 className="font-serif text-lg">Add question to exam</h2>
          {msg && <p className="text-brick text-xs">{msg}</p>}
          <select
            name="examId"
            required
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="w-full border border-line px-3 py-2 bg-white"
          >
            <option value="">Select exam</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
          <select
            value={qType}
            onChange={(e) => setQType(e.target.value as "MCQ" | "ESSAY")}
            className="w-full border border-line px-3 py-2 bg-white"
          >
            <option value="MCQ">MCQ</option>
            <option value="ESSAY">Essay</option>
          </select>
          <textarea name="prompt" required rows={2} placeholder="Question" className="w-full border border-line px-3 py-2" />
          <input name="marks" type="number" step="0.5" defaultValue={1} min={0.5} className="w-full border border-line px-3 py-2" />
          {qType === "MCQ" && (
            <>
              <input name="opt0" required placeholder="Option A" className="w-full border border-line px-3 py-2" />
              <input name="opt1" required placeholder="Option B" className="w-full border border-line px-3 py-2" />
              <input name="opt2" placeholder="Option C" className="w-full border border-line px-3 py-2" />
              <input name="opt3" placeholder="Option D" className="w-full border border-line px-3 py-2" />
              <select name="correctIndex" className="w-full border border-line px-3 py-2 bg-white">
                <option value={0}>Correct: A</option>
                <option value={1}>Correct: B</option>
                <option value={2}>Correct: C</option>
                <option value={3}>Correct: D</option>
              </select>
            </>
          )}
          <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
            Add to exam
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={saveBank} className="ledger-block space-y-2 text-sm">
          <h2 className="font-serif text-lg">Question bank</h2>
          <input name="subjectTag" placeholder="Tag (e.g. Maths)" className="w-full border border-line px-3 py-2" />
          <select name="type" className="w-full border border-line px-3 py-2 bg-white">
            <option value="MCQ">MCQ</option>
            <option value="ESSAY">Essay</option>
          </select>
          <textarea name="prompt" required rows={2} placeholder="Question" className="w-full border border-line px-3 py-2" />
          <input name="marks" type="number" defaultValue={1} min={0.5} step="0.5" className="w-full border border-line px-3 py-2" />
          <input name="opt0" placeholder="A (MCQ)" className="w-full border border-line px-3 py-2" />
          <input name="opt1" placeholder="B" className="w-full border border-line px-3 py-2" />
          <input name="opt2" placeholder="C" className="w-full border border-line px-3 py-2" />
          <input name="opt3" placeholder="D" className="w-full border border-line px-3 py-2" />
          <select name="correctIndex" className="w-full border border-line px-3 py-2 bg-white">
            <option value={0}>Correct A</option>
            <option value={1}>Correct B</option>
            <option value={2}>Correct C</option>
            <option value={3}>Correct D</option>
          </select>
          <button type="submit" disabled={busy} className="w-full border border-navy text-navy py-2">
            Save to bank
          </button>
        </form>

        <section className="ledger-block !p-0 overflow-x-auto">
          <div className="p-4 pb-0">
            <h2 className="font-serif text-lg">Bank ({bank.length})</h2>
            <p className="text-xs text-ink/50">Import into selected exam above</p>
          </div>
          <ul className="p-4 space-y-2 text-sm max-h-80 overflow-y-auto">
            {bank.map((b) => (
              <li key={b.id} className="border-b border-line pb-2 flex justify-between gap-2">
                <div>
                  <span className="text-xs text-ink/40">{b.type}</span> {b.prompt.slice(0, 80)}
                  {b.subjectTag && <span className="text-xs text-ink/40 block">{b.subjectTag}</span>}
                </div>
                <button
                  type="button"
                  disabled={busy || !examId}
                  onClick={() => importBank(b.id)}
                  className="text-xs underline shrink-0"
                >
                  Import
                </button>
              </li>
            ))}
            {bank.length === 0 && <li className="text-ink/40">Empty bank</li>}
          </ul>
        </section>
      </div>

      <section className="ledger-block !p-0 overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-serif text-lg">Exams</h2>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>Title</th>
              <th>Mins</th>
              <th>Q</th>
              <th>Attempts</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e.id}>
                <td>{e.title}</td>
                <td>{e.durationMinutes}</td>
                <td>{e.questionCount}</td>
                <td>{e.attemptCount}</td>
                <td>{e.isOpen ? "Open" : "Closed"}</td>
                <td className="space-x-2 text-xs">
                  <button type="button" className="underline" onClick={() => toggle(e.id)}>
                    {e.isOpen ? "Close" : "Open"}
                  </button>
                  <Link href={`/cbt/${e.id}/take`} className="underline">
                    Preview
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
