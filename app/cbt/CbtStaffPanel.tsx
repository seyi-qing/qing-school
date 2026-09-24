"use client";

import { FormEvent, useState } from "react";
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

export function CbtStaffPanel({ exams }: { exams: Exam[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [examId, setExamId] = useState(exams[0]?.id || "");

  async function createExam(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        durationMinutes: fd.get("durationMinutes"),
      }),
    });
    setBusy(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  async function addQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const options = [fd.get("opt0"), fd.get("opt1"), fd.get("opt2"), fd.get("opt3")].filter(
      Boolean
    ) as string[];
    const res = await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: fd.get("examId"),
        prompt: fd.get("prompt"),
        options,
        correctIndex: Number(fd.get("correctIndex")),
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
          <input
            name="durationMinutes"
            type="number"
            defaultValue={30}
            min={5}
            className="w-full border border-line px-3 py-2"
          />
          <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
            Create
          </button>
        </form>

        <form onSubmit={addQuestion} className="ledger-block space-y-2 text-sm">
          <h2 className="font-serif text-lg">Add MCQ</h2>
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
          <textarea name="prompt" required rows={2} placeholder="Question" className="w-full border border-line px-3 py-2" />
          <input name="opt0" required placeholder="Option A" className="w-full border border-line px-3 py-2" />
          <input name="opt1" required placeholder="Option B" className="w-full border border-line px-3 py-2" />
          <input name="opt2" placeholder="Option C (optional)" className="w-full border border-line px-3 py-2" />
          <input name="opt3" placeholder="Option D (optional)" className="w-full border border-line px-3 py-2" />
          <select name="correctIndex" className="w-full border border-line px-3 py-2 bg-white">
            <option value={0}>Correct: A</option>
            <option value={1}>Correct: B</option>
            <option value={2}>Correct: C</option>
            <option value={3}>Correct: D</option>
          </select>
          <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
            Add question
          </button>
        </form>
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
            {exams.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-ink/50 py-6">
                  No exams yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
