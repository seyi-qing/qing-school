"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Block =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "button"; label: string; href: string }
  | { id: string; type: "divider" };

type Page = {
  id: string;
  slug: string;
  title: string;
  body: string;
  published: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function parseBlocks(body: string): Block[] {
  try {
    const j = JSON.parse(body);
    if (Array.isArray(j)) return j;
  } catch {
    /* legacy plain text */
  }
  if (!body.trim()) return [];
  return [{ id: uid(), type: "paragraph", text: body }];
}

function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.type === "heading") {
        const tag = `h${b.level}`;
        return `<${tag}>${escapeHtml(b.text)}</${tag}>`;
      }
      if (b.type === "paragraph") return `<p>${escapeHtml(b.text).replace(/\n/g, "<br/>")}</p>`;
      if (b.type === "image")
        return `<img src="${escapeAttr(b.url)}" alt="${escapeAttr(b.alt)}" style="max-width:100%;height:auto"/>`;
      if (b.type === "button")
        return `<p><a href="${escapeAttr(b.href)}" style="display:inline-block;padding:8px 16px;background:#1a2744;color:#fff;text-decoration:none">${escapeHtml(b.label)}</a></p>`;
      if (b.type === "divider") return `<hr/>`;
      return "";
    })
    .join("\n");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

export function CmsEditor({
  pages,
  theme,
}: {
  pages: Page[];
  theme: { primary: string; accent: string; font: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [themeForm, setThemeForm] = useState(theme);

  function loadPage(p: Page) {
    setEditId(p.id);
    setSlug(p.slug);
    setTitle(p.title);
    setPublished(p.published);
    setBlocks(parseBlocks(p.body));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const body = JSON.stringify(blocks);
    const res = await fetch("/api/cms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title, body, published }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(typeof data.error === "string" ? data.error : "Save failed");
      return;
    }
    setMsg("Saved");
    router.refresh();
  }

  async function saveTheme(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/cms/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(themeForm),
    });
    setBusy(false);
    setMsg("Theme saved");
    router.refresh();
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Upload failed");
      return;
    }
    setBlocks((b) => [...b, { id: uid(), type: "image", url: data.url, alt: file.name }]);
  }

  async function remove(id: string) {
    if (!confirm("Delete page?")) return;
    await fetch(`/api/cms?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={saveTheme} className="ledger-block grid sm:grid-cols-4 gap-2 text-sm items-end">
        <h2 className="font-serif text-lg sm:col-span-4">Theme</h2>
        <div>
          <label className="text-xs text-ink/50">Primary</label>
          <input
            type="color"
            value={themeForm.primary}
            onChange={(e) => setThemeForm({ ...themeForm, primary: e.target.value })}
            className="w-full h-10 border border-line"
          />
        </div>
        <div>
          <label className="text-xs text-ink/50">Accent</label>
          <input
            type="color"
            value={themeForm.accent}
            onChange={(e) => setThemeForm({ ...themeForm, accent: e.target.value })}
            className="w-full h-10 border border-line"
          />
        </div>
        <div>
          <label className="text-xs text-ink/50">Font</label>
          <select
            value={themeForm.font}
            onChange={(e) => setThemeForm({ ...themeForm, font: e.target.value })}
            className="w-full border border-line px-2 py-2 bg-white"
          >
            <option value="serif">Serif</option>
            <option value="sans">Sans</option>
          </select>
        </div>
        <button type="submit" disabled={busy} className="bg-navy text-paper py-2">
          Save theme
        </button>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={save} className="ledger-block space-y-3 text-sm">
          <h2 className="font-serif text-lg">{editId ? "Edit page" : "New page"}</h2>
          {msg && <p className="text-xs text-sage">{msg}</p>}
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            placeholder="slug"
            className="w-full border border-line px-3 py-2"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Title"
            className="w-full border border-line px-3 py-2"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="border border-line px-2 py-1 text-xs"
              onClick={() => setBlocks((b) => [...b, { id: uid(), type: "heading", text: "Heading", level: 2 }])}
            >
              + Heading
            </button>
            <button
              type="button"
              className="border border-line px-2 py-1 text-xs"
              onClick={() => setBlocks((b) => [...b, { id: uid(), type: "paragraph", text: "" }])}
            >
              + Paragraph
            </button>
            <button
              type="button"
              className="border border-line px-2 py-1 text-xs"
              onClick={() =>
                setBlocks((b) => [...b, { id: uid(), type: "button", label: "Learn more", href: "/admissions" }])
              }
            >
              + Button
            </button>
            <button
              type="button"
              className="border border-line px-2 py-1 text-xs"
              onClick={() => setBlocks((b) => [...b, { id: uid(), type: "divider" }])}
            >
              + Divider
            </button>
            <label className="border border-line px-2 py-1 text-xs cursor-pointer">
              + Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f);
                }}
              />
            </label>
          </div>

          <div className="space-y-2 border border-line p-2 max-h-[28rem] overflow-y-auto">
            {blocks.map((b, i) => (
              <div key={b.id} className="border border-line/60 p-2 bg-white">
                <div className="flex gap-1 mb-1">
                  <button type="button" className="text-xs underline" onClick={() => move(i, -1)}>
                    Up
                  </button>
                  <button type="button" className="text-xs underline" onClick={() => move(i, 1)}>
                    Down
                  </button>
                  <button
                    type="button"
                    className="text-xs text-brick underline ml-auto"
                    onClick={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))}
                  >
                    Remove
                  </button>
                </div>
                {b.type === "heading" && (
                  <input
                    className="w-full border border-line px-2 py-1 font-serif text-lg"
                    value={b.text}
                    onChange={(e) =>
                      setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...b, text: e.target.value } : x)))
                    }
                  />
                )}
                {b.type === "paragraph" && (
                  <textarea
                    className="w-full border border-line px-2 py-1"
                    rows={3}
                    value={b.text}
                    onChange={(e) =>
                      setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...b, text: e.target.value } : x)))
                    }
                  />
                )}
                {b.type === "image" && (
                  <div className="text-xs break-all">
                    <img src={b.url} alt={b.alt} className="max-h-32 mb-1" />
                    {b.url}
                  </div>
                )}
                {b.type === "button" && (
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      value={b.label}
                      onChange={(e) =>
                        setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...b, label: e.target.value } : x)))
                      }
                      className="border border-line px-2 py-1"
                    />
                    <input
                      value={b.href}
                      onChange={(e) =>
                        setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...b, href: e.target.value } : x)))
                      }
                      className="border border-line px-2 py-1"
                    />
                  </div>
                )}
                {b.type === "divider" && <hr />}
              </div>
            ))}
            {blocks.length === 0 && <p className="text-ink/40 text-xs p-2">Add blocks above</p>}
          </div>

          <label className="flex gap-2 items-center">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published
          </label>
          <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
            {busy ? "Saving…" : "Save page"}
          </button>
        </form>

        <div className="space-y-4">
          <section className="ledger-block">
            <h2 className="font-serif text-lg mb-2">Live preview</h2>
            <div
              className="border border-line p-4 min-h-[12rem] text-sm"
              style={{
                fontFamily: themeForm.font === "sans" ? "system-ui,sans-serif" : "Georgia,serif",
                // @ts-expect-error css var
                "--cms-primary": themeForm.primary,
              }}
              dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) }}
            />
          </section>

          <section className="ledger-block !p-0 overflow-x-auto">
            <div className="p-4 pb-0">
              <h2 className="font-serif text-lg">Pages</h2>
            </div>
            <table className="ledger mt-3">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>URL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td className="font-mono text-xs">
                      <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="underline">
                        /p/{p.slug}
                      </a>
                    </td>
                    <td className="text-xs space-x-2">
                      <button type="button" className="underline" onClick={() => loadPage(p)}>
                        Edit
                      </button>
                      <button type="button" className="text-brick underline" onClick={() => remove(p.id)}>
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
