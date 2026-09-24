"use client";

import { FormEvent, useState } from "react";

type Config = {
  schoolName: string;
  motto?: string;
  footerNote?: string;
  showPosition: boolean;
  showAttendance: boolean;
  principalTitle?: string;
  headerBg?: string;
  accentColor?: string;
  logoUrl?: string;
  sections?: string[];
};

const ALL_SECTIONS = [
  "header",
  "studentInfo",
  "scoresTable",
  "attendance",
  "position",
  "remarks",
  "signatures",
  "footer",
];

export function ReportTemplateForm({ initial }: { initial: Config }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState<Config>({
    headerBg: "#1a2744",
    accentColor: "#c9a227",
    sections: ALL_SECTIONS,
    ...initial,
  });

  function toggleSection(id: string) {
    const cur = cfg.sections || ALL_SECTIONS;
    setCfg({
      ...cfg,
      sections: cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id],
    });
  }

  function moveSection(id: string, dir: -1 | 1) {
    const cur = [...(cfg.sections || ALL_SECTIONS)];
    const i = cur.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cur.length) return;
    [cur[i], cur[j]] = [cur[j], cur[i]];
    setCfg({ ...cfg, sections: cur });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/report-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...cfg,
        showPosition: (cfg.sections || []).includes("position"),
        showAttendance: (cfg.sections || []).includes("attendance"),
      }),
    });
    setBusy(false);
    setMsg(res.ok ? "Layout saved." : "Failed");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={onSubmit} className="ledger-block space-y-3 text-sm">
        {msg && <p className="text-sage">{msg}</p>}
        <div>
          <label className="text-xs uppercase text-ink/50">School name</label>
          <input
            required
            value={cfg.schoolName}
            onChange={(e) => setCfg({ ...cfg, schoolName: e.target.value })}
            className="w-full border border-line px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-ink/50">Motto</label>
          <input
            value={cfg.motto || ""}
            onChange={(e) => setCfg({ ...cfg, motto: e.target.value })}
            className="w-full border border-line px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-ink/50">Logo URL</label>
          <input
            value={cfg.logoUrl || ""}
            onChange={(e) => setCfg({ ...cfg, logoUrl: e.target.value })}
            className="w-full border border-line px-3 py-2 mt-1"
            placeholder="https://... or upload via Blob"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs uppercase text-ink/50">Header colour</label>
            <input
              type="color"
              value={cfg.headerBg || "#1a2744"}
              onChange={(e) => setCfg({ ...cfg, headerBg: e.target.value })}
              className="w-full h-10 border border-line mt-1"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-ink/50">Accent</label>
            <input
              type="color"
              value={cfg.accentColor || "#c9a227"}
              onChange={(e) => setCfg({ ...cfg, accentColor: e.target.value })}
              className="w-full h-10 border border-line mt-1"
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase text-ink/50">Principal title</label>
          <input
            value={cfg.principalTitle || ""}
            onChange={(e) => setCfg({ ...cfg, principalTitle: e.target.value })}
            className="w-full border border-line px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-ink/50">Footer note</label>
          <textarea
            rows={2}
            value={cfg.footerNote || ""}
            onChange={(e) => setCfg({ ...cfg, footerNote: e.target.value })}
            className="w-full border border-line px-3 py-2 mt-1"
          />
        </div>

        <div>
          <p className="text-xs uppercase text-ink/50 mb-2">Layout sections (order)</p>
          <ul className="space-y-1">
            {(cfg.sections || ALL_SECTIONS).map((s) => (
              <li key={s} className="flex items-center gap-2 border border-line px-2 py-1">
                <input type="checkbox" checked onChange={() => toggleSection(s)} />
                <span className="flex-1 capitalize">{s.replace(/([A-Z])/g, " $1")}</span>
                <button type="button" className="text-xs underline" onClick={() => moveSection(s, -1)}>
                  Up
                </button>
                <button type="button" className="text-xs underline" onClick={() => moveSection(s, 1)}>
                  Down
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-ink/40 mt-1">Unchecked sections are omitted from the card.</p>
        </div>

        <button type="submit" disabled={busy} className="bg-navy text-paper px-4 py-2 disabled:opacity-60">
          {busy ? "Saving…" : "Save layout"}
        </button>
      </form>

      {/* Visual WYSIWYG-style preview */}
      <div className="ledger-block !p-0 overflow-hidden">
        <div className="p-3 border-b border-line text-xs text-ink/50">Live preview (A4-ish)</div>
        <div className="bg-white text-ink text-xs p-4 min-h-[28rem]" style={{ maxWidth: 420, margin: "0 auto" }}>
          {(cfg.sections || ALL_SECTIONS).includes("header") && (
            <div className="text-center text-paper p-3 mb-3" style={{ background: cfg.headerBg }}>
              {cfg.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cfg.logoUrl} alt="" className="h-10 mx-auto mb-2 object-contain" />
              )}
              <div className="font-serif text-base">{cfg.schoolName}</div>
              {cfg.motto && <div className="opacity-80 text-[10px] mt-1">{cfg.motto}</div>}
              <div className="text-[10px] mt-2" style={{ color: cfg.accentColor }}>
                TERMINAL REPORT CARD
              </div>
            </div>
          )}
          {(cfg.sections || []).includes("studentInfo") && (
            <div className="border border-line p-2 mb-2 grid grid-cols-2 gap-1">
              <span>Name: Chioma Okafor</span>
              <span>Class: JSS 1 A</span>
              <span>Adm: FS/2025/0001</span>
              <span>Term: First Term</span>
            </div>
          )}
          {(cfg.sections || []).includes("scoresTable") && (
            <table className="w-full border-collapse mb-2">
              <thead>
                <tr style={{ background: cfg.headerBg, color: "#fff" }}>
                  <th className="border border-line p-1 text-left">Subject</th>
                  <th className="border border-line p-1">CA</th>
                  <th className="border border-line p-1">Exam</th>
                  <th className="border border-line p-1">Total</th>
                  <th className="border border-line p-1">Grade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-line p-1">Mathematics</td>
                  <td className="border border-line p-1 text-center">28</td>
                  <td className="border border-line p-1 text-center">52</td>
                  <td className="border border-line p-1 text-center">80</td>
                  <td className="border border-line p-1 text-center">A</td>
                </tr>
                <tr>
                  <td className="border border-line p-1">English</td>
                  <td className="border border-line p-1 text-center">25</td>
                  <td className="border border-line p-1 text-center">48</td>
                  <td className="border border-line p-1 text-center">73</td>
                  <td className="border border-line p-1 text-center">B</td>
                </tr>
              </tbody>
            </table>
          )}
          {(cfg.sections || []).includes("attendance") && (
            <p className="mb-2">Attendance: 58 / 60 days</p>
          )}
          {(cfg.sections || []).includes("position") && <p className="mb-2">Position: 3rd of 28</p>}
          {(cfg.sections || []).includes("remarks") && (
            <p className="mb-2 italic">Remark: Excellent performance. Keep it up.</p>
          )}
          {(cfg.sections || []).includes("signatures") && (
            <div className="grid grid-cols-2 gap-4 mt-6 text-center">
              <div>
                <div className="border-t border-ink pt-1">{cfg.principalTitle || "Principal"}</div>
              </div>
              <div>
                <div className="border-t border-ink pt-1">Class teacher</div>
              </div>
            </div>
          )}
          {(cfg.sections || []).includes("footer") && (
            <p className="text-[10px] text-ink/50 mt-4 text-center">{cfg.footerNote}</p>
          )}
        </div>
      </div>
    </div>
  );
}
