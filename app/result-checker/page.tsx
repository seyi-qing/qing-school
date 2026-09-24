"use client";

import { useState } from "react";

export default function ResultCheckerPage() {
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/result-checker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admissionNumber, pin }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setResult(data);
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="w-10 h-10 border-2 border-gold flex items-center justify-center font-serif text-gold text-lg mb-6 mx-auto">FS</div>
        <h1 className="font-serif text-2xl text-center mb-1">Result Checker</h1>
        <p className="text-sm text-ink/60 text-center mb-6">Enter your admission number and scratch-card PIN to view your result.</p>
        <form onSubmit={check} className="ledger-block space-y-3">
          <input value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} placeholder="Admission number" required className="w-full border border-line px-3 py-2 text-sm" />
          <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" required className="w-full border border-line px-3 py-2 text-sm" />
          {error && <p className="text-sm text-brick">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-navy text-paper py-2.5 text-sm disabled:opacity-60">
            {loading ? "Checking..." : "Check Result"}
          </button>
        </form>
        {result && (
          <div className="ledger-block mt-4">
            <h2 className="font-serif text-lg mb-2">{result.student.name}</h2>
            <table className="ledger">
              <thead><tr><th>Subject</th><th>Total</th><th>Grade</th></tr></thead>
              <tbody>
                {result.scores.map((s: any, i: number) => (
                  <tr key={i}><td>{s.subject}</td><td>{s.total}</td><td>{s.grade}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
