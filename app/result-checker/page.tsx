"use client";

import { useState } from "react";
import { SCHOOL } from "@/lib/school-config";

type ScoreRow = { subject: string; total: number; grade: string | null; remark?: string | null };

export default function ResultCheckerPage() {
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    student: { name: string; admissionNumber: string };
    scores: ScoreRow[];
  } | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/result-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admissionNumber, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load result");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper flex flex-col px-4 py-6 sm:py-10">
      <nav className="w-full max-w-md mx-auto flex items-center justify-between text-sm mb-8">
        <a href="/" className="text-navy underline hover:text-gold">
          ← Home
        </a>
        <a href="/login" className="text-navy underline hover:text-gold">
          Portal login →
        </a>
      </nav>
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
        <div className="w-12 h-12 border-2 border-gold flex items-center justify-center font-serif text-gold text-sm mb-6 mx-auto font-medium">
          {SCHOOL.shortName}
        </div>
        <h1 className="font-serif text-2xl text-center mb-1">Result Checker</h1>
        <p className="text-sm text-ink/60 text-center mb-1">{SCHOOL.name}</p>
        <p className="text-sm text-ink/50 text-center mb-6">
          Enter admission number and scratch-card PIN to view terminal results.
        </p>

        <form onSubmit={check} className="ledger-block space-y-3">
          <input
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="Admission number"
            required
            autoComplete="off"
            className="w-full border border-line px-3 py-2 text-sm"
          />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            required
            autoComplete="off"
            className="w-full border border-line px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-brick">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-paper py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Checking..." : "Check Result"}
          </button>
        </form>

        {result && (
          <div className="ledger-block mt-4 report-card-print">
            <div className="no-print mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => window.print()}
                className="text-sm border border-navy text-navy px-3 py-1.5"
              >
                Print
              </button>
            </div>
            <h2 className="font-serif text-lg mb-1">{result.student.name}</h2>
            <p className="text-xs font-mono text-ink/50 mb-3">{result.student.admissionNumber}</p>
            <table className="ledger">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Total</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {result.scores.map((s, i) => (
                  <tr key={i}>
                    <td>{s.subject}</td>
                    <td>{s.total}</td>
                    <td>{s.grade ?? "-"}</td>
                  </tr>
                ))}
                {result.scores.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-ink/50 py-4">
                      No scores published for this term yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="text-[10px] text-ink/40 mt-4 text-center">
              {SCHOOL.shortName} · Official result checker
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
