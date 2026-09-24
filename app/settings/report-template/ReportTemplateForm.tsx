"use client";

import { FormEvent, useState } from "react";

type Config = {
  schoolName: string;
  motto?: string;
  footerNote?: string;
  showPosition: boolean;
  showAttendance: boolean;
  principalTitle?: string;
};

export function ReportTemplateForm({ initial }: { initial: Config }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/report-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolName: fd.get("schoolName"),
        motto: fd.get("motto") || undefined,
        footerNote: fd.get("footerNote") || undefined,
        principalTitle: fd.get("principalTitle") || undefined,
        showPosition: fd.get("showPosition") === "on",
        showAttendance: fd.get("showAttendance") === "on",
      }),
    });
    setBusy(false);
    setMsg(res.ok ? "Saved." : "Failed to save");
  }

  return (
    <form onSubmit={onSubmit} className="ledger-block max-w-lg space-y-3 text-sm">
      {msg && <p className="text-sage">{msg}</p>}
      <div>
        <label className="text-xs uppercase text-ink/50">School name</label>
        <input
          name="schoolName"
          required
          defaultValue={initial.schoolName}
          className="w-full border border-line px-3 py-2 mt-1"
        />
      </div>
      <div>
        <label className="text-xs uppercase text-ink/50">Motto</label>
        <input name="motto" defaultValue={initial.motto} className="w-full border border-line px-3 py-2 mt-1" />
      </div>
      <div>
        <label className="text-xs uppercase text-ink/50">Principal title line</label>
        <input
          name="principalTitle"
          defaultValue={initial.principalTitle}
          className="w-full border border-line px-3 py-2 mt-1"
        />
      </div>
      <div>
        <label className="text-xs uppercase text-ink/50">Footer note</label>
        <textarea
          name="footerNote"
          rows={2}
          defaultValue={initial.footerNote}
          className="w-full border border-line px-3 py-2 mt-1"
        />
      </div>
      <label className="flex gap-2 items-center">
        <input type="checkbox" name="showPosition" defaultChecked={initial.showPosition} />
        Show class position
      </label>
      <label className="flex gap-2 items-center">
        <input type="checkbox" name="showAttendance" defaultChecked={initial.showAttendance} />
        Show attendance summary
      </label>
      <button type="submit" disabled={busy} className="bg-navy text-paper px-4 py-2 disabled:opacity-60">
        {busy ? "Saving…" : "Save template"}
      </button>
    </form>
  );
}
