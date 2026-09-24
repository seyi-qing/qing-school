"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Q = { id: string; prompt: string; options: string[] };

export function TakeExamClient({
  examId,
  questions,
  durationMinutes,
  canSubmit,
}: {
  examId: string;
  questions: Q[];
  durationMinutes: number;
  canSubmit: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [result, setResult] = useState<{ score: number; total: number; percent: number } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canSubmit || result) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          void submit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, result]);

  async function submit() {
    if (!canSubmit || busy || result) return;
    setBusy(true);
    const res = await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId, answers }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setResult(data.attempt);
      router.refresh();
    }
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");

  if (result) {
    return (
      <div className="ledger-block text-center py-10">
        <p className="font-serif text-2xl">Score</p>
        <p className="ledger-number text-4xl mt-2">
          {result.score}/{result.total}
        </p>
        <p className="text-ink/60 mt-1">{result.percent}%</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canSubmit && (
        <p className="text-sm text-brick font-medium">
          Time left: {mm}:{ss}
        </p>
      )}
      {!canSubmit && (
        <p className="text-xs text-ink/50">Preview mode (staff) — answers are not scored.</p>
      )}
      {questions.map((q, i) => (
        <fieldset key={q.id} className="ledger-block">
          <legend className="font-medium text-sm mb-2">
            {i + 1}. {q.prompt}
          </legend>
          <div className="space-y-1 text-sm">
            {q.options.map((opt, idx) => (
              <label key={idx} className="flex gap-2 items-start cursor-pointer">
                <input
                  type="radio"
                  name={q.id}
                  disabled={!canSubmit}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {questions.length === 0 && <p className="text-sm text-ink/50">No questions yet.</p>}
      {canSubmit && questions.length > 0 && (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="w-full sm:w-auto bg-navy text-paper px-6 py-2.5 disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit test"}
        </button>
      )}
    </div>
  );
}
