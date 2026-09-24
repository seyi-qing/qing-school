"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TermView {
  id: string;
  name: string;
  isCurrent: boolean;
}
interface SessionView {
  id: string;
  name: string;
  terms: TermView[];
}

export function TermSwitcher({ sessions }: { sessions: SessionView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setCurrent(termId: string) {
    setBusy(true);
    await fetch("/api/settings/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termId }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <div key={s.id}>
          <p className="text-sm font-medium">{s.name}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {s.terms.map((t) => (
              <button
                key={t.id}
                disabled={busy}
                onClick={() => setCurrent(t.id)}
                className={`text-xs px-3 py-1.5 border ${
                  t.isCurrent ? "border-gold bg-gold/10 text-gold-dark" : "border-line hover:border-navy"
                }`}
              >
                {t.name} {t.isCurrent && "(current)"}
              </button>
            ))}
          </div>
        </div>
      ))}
      {sessions.length === 0 && <p className="text-sm text-ink/50">No sessions yet — add one via Prisma Studio.</p>}
    </div>
  );
}
