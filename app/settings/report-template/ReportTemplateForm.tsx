"use client";

import { FormEvent, useRef, useState } from "react";

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

const SECTION_LABELS: Record<string, string> = {
  header: "Header",
  studentInfo: "Student info",
  scoresTable: "Scores table",
  attendance: "Attendance",
  position: "Position",
  remarks: "Remarks",
  signatures: "Signatures",
  footer: "Footer",
};

export function ReportTemplateForm({ initial }: { initial: Config }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragId = useRef<string | null>(null);
  const [cfg, setCfg] = useState<Config>({
    headerBg: "#1a2744",
    accentColor: "#c9a227",
    sections: ALL_SECTIONS,
    ...initial,
    logoUrl: initial.logoUrl || "/logo.svg",
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

  function onDragStart(id: string) {
    dragId.current = id;
  }

  function onDrop(targetId: string) {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === targetId) return;
    const cur = [...(cfg.sections || ALL_SECTIONS)];
    const fromIdx = cur.indexOf(from);
    const toIdx = cur.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    cur.splice(fromIdx, 1);
    cur.splice(toIdx, 0, from);
    setCfg({ ...cfg, sections: cur });
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setMsg("");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setMsg(
        data.error ||
          "Upload failed. Set BLOB_READ_WRITE_TOKEN in Vercel, or paste a public image URL."
      );
      return;
    }
    if (data.url) {
      setCfg({ ...cfg, logoUrl: data.url });
      setMsg("Logo uploaded — click Save layout to keep it.");
    }
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
    setMsg(res.ok ? "Layout saved." : "Failed to save.");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={onSubmit} className="ledger-block space-y-3 text-sm">
        {msg && (
          <p
            className={
              msg.startsWith("Layout") || msg.startsWith("Logo") ? "text-sage" : "text-brick"
            }
          >
            {msg}
          </p>
        )}
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
          <label className="text-xs uppercase text-ink/50">Logo</label>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {cfg.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cfg.logoUrl}
                alt="Logo preview"
                className="h-12 w-12 object-contain border border-line bg-white p-1"
              />
            ) : (
              <div className="h-12 w-12 border border-dashed border-line flex items-center justify-center text-[10px] text-ink/40">
                None
              </div>
            )}
            <div className="flex flex-col gap-1 flex-1 min-w-[12rem]">
              <input
                value={cfg.logoUrl || ""}
                onChange={(e) => setCfg({ ...cfg, logoUrl: e.target.value })}
                className="w-full border border-line px-3 py-2 text-sm"
                placeholder="/logo.svg or https://..."
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCfg({ ...cfg, logoUrl: "/logo.svg" })}
                  className="text-xs border border-navy text-navy px-2 py-1 hover:bg-navy hover:text-paper"
                >
                  Use school logo
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="text-xs border border-line px-2 py-1 hover:bg-ink/5 disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "Upload image"}
                </button>
                {cfg.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setCfg({ ...cfg, logoUrl: "" })}
                    className="text-xs text-brick underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <p className="text-[10px] text-ink/40 mt-1">
            Fastest: click <strong>Use school logo</strong> (uses /logo.svg). Or upload a PNG/JPG if
            Vercel Blob is configured.
          </p>
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
          <p className="text-xs uppercase text-ink/50 mb-2">Layout sections (drag to reorder)</p>
          <ul className="space-y-1">
            {(cfg.sections || ALL_SECTIONS).map((s) => (
              <li
                key={s}
                draggable
                onDragStart={() => onDragStart(s)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(s)}
                className="flex items-center gap-2 border border-line px-2 py-1.5 bg-white cursor-grab active:cursor-grabbing"
              >
                <span className="text-ink/30 text-xs select-none" aria-hidden>
                  ⋮⋮
                </span>
                <input
                  type="checkbox"
                  checked
                  onChange={() => toggleSection(s)}
                  className="shrink-0"
                />
                <span className="flex-1">{SECTION_LABELS[s] || s}</span>
                <button type="button" className="text-xs underline" onClick={() => moveSection(s, -1)}>
                  Up
                </button>
                <button type="button" className="text-xs underline" onClick={() => moveSection(s, 1)}>
                  Down
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-ink/40 mt-1">
            Drag rows to change order. Uncheck to hide a section on the printed card.
          </p>
        </div>

        <button type="submit" disabled={busy} className="bg-navy text-paper px-4 py-2 disabled:opacity-60">
          {busy ? "Saving…" : "Save layout"}
        </button>
      </form>

      <div className="ledger-block !p-0 overflow-hidden">
        <div className="p-3 border-b border-line text-xs text-ink/50">Live preview (A4-ish)</div>
        <div
          className="bg-white text-ink text-xs p-4 min-h-[28rem]"
          style={{ maxWidth: 420, margin: "0 auto" }}
        >
          {(cfg.sections || ALL_SECTIONS).includes("header") && (
            <div className="text-center text-paper p-3 mb-3" style={{ background: cfg.headerBg }}>
              {cfg.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cfg.logoUrl} alt="" className="h-12 mx-auto mb-2 object-contain" />
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
              <span>Adm: KMS/2025/0001</span>
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
