"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Q = {
  id: string;
  prompt: string;
  type: string;
  marks: number;
  options: string[];
};

export function TakeExamClient({
  examId,
  questions,
  durationMinutes,
  canSubmit,
  proctoring,
  negativeMark,
}: {
  examId: string;
  questions: Q[];
  durationMinutes: number;
  canSubmit: boolean;
  proctoring: boolean;
  negativeMark: number;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    percent: number;
    needsGrading?: boolean;
    proctorEvents?: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const proctorLog = useRef<{ event: string; at: string }[]>([]);

  const logProctor = useCallback(
    (event: string) => {
      if (!proctoring || !canSubmit) return;
      proctorLog.current.push({ event, at: new Date().toISOString() });
      setWarnings((w) => w + 1);
    },
    [proctoring, canSubmit]
  );

  useEffect(() => {
    if (!proctoring || !canSubmit) return;

    const onVis = () => {
      if (document.hidden) logProctor("TAB_HIDDEN");
    };
    const onBlur = () => logProctor("WINDOW_BLUR");

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);

    // Request fullscreen once (browser may block without gesture)
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => logProctor("FULLSCREEN_DENIED"));
    }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [proctoring, canSubmit, logProctor]);

  const submit = useCallback(async () => {
    if (!canSubmit || busy || result) return;
    setBusy(true);
    const res = await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId,
        answers,
        proctorLog: proctorLog.current,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setResult(data.attempt);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      router.refresh();
    }
  }, [canSubmit, busy, result, examId, answers, router]);

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
  }, [canSubmit, result, submit]);

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
        {result.needsGrading && (
          <p className="text-sm text-gold-dark mt-2">Essay answers await teacher grading.</p>
        )}
        {typeof result.proctorEvents === "number" && result.proctorEvents > 0 && (
          <p className="text-xs text-brick mt-2">{result.proctorEvents} proctor event(s) logged</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canSubmit && (
        <div className="flex flex-wrap gap-3 text-sm items-center">
          <span className="text-brick font-medium">
            Time: {mm}:{ss}
          </span>
          {negativeMark > 0 && (
            <span className="text-ink/50">Negative marking: −{negativeMark} × marks per wrong MCQ</span>
          )}
          {proctoring && (
            <span className="text-ink/50">Proctor: {warnings} warning(s) (tab/window leave)</span>
          )}
        </div>
      )}
      {!canSubmit && (
        <p className="text-xs text-ink/50">Preview mode — not scored.</p>
      )}

      {questions.map((q, i) => (
        <fieldset key={q.id} className="ledger-block">
          <legend className="font-medium text-sm mb-2">
            {i + 1}. {q.prompt}{" "}
            <span className="text-ink/40 font-normal">
              ({q.marks} mark{q.marks === 1 ? "" : "s"} · {q.type})
            </span>
          </legend>
          {q.type === "ESSAY" ? (
            <textarea
              rows={4}
              disabled={!canSubmit}
              className="w-full border border-line px-3 py-2 text-sm"
              placeholder="Write your answer…"
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            />
          ) : (
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
          )}
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
