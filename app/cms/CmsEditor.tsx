"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type Block,
  newId,
  parseBlocks,
  blocksToHtml,
  sanitizeBasicHtml,
} from "@/lib/cms-blocks";

type Page = {
  id: string;
  slug: string;
  title: string;
  body: string;
  published: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  publishAt?: string | null;
};

type Media = { id: string; url: string; filename: string };

function SortableBlock({
  block,
  onChange,
  onRemove,
}: {
  block: Block;
  onChange: (b: Block) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-line/70 p-2 bg-white mb-2">
      <div className="flex gap-2 items-center mb-1 text-xs">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing px-2 py-0.5 border border-line"
          {...attributes}
          {...listeners}
        >
          ⋮⋮ Drag
        </button>
        <span className="text-ink/40 uppercase">{block.type}</span>
        <button type="button" className="text-brick underline ml-auto" onClick={onRemove}>
          Remove
        </button>
      </div>

      {block.type === "heading" && (
        <div className="flex gap-2">
          <select
            value={block.level}
            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 1 | 2 | 3 })}
            className="border border-line text-xs"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            className="flex-1 border border-line px-2 py-1 font-serif"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
          />
        </div>
      )}

      {block.type === "paragraph" && (
        <div>
          <div className="flex gap-1 mb-1">
            <button
              type="button"
              className="text-xs border border-line px-2 py-0.5 font-bold"
              onMouseDown={(e) => {
                e.preventDefault();
                document.execCommand("bold");
              }}
            >
              B
            </button>
            <button
              type="button"
              className="text-xs border border-line px-2 py-0.5 italic"
              onMouseDown={(e) => {
                e.preventDefault();
                document.execCommand("italic");
              }}
            >
              I
            </button>
            <button
              type="button"
              className="text-xs border border-line px-2 py-0.5 underline"
              onMouseDown={(e) => {
                e.preventDefault();
                const url = prompt("Link URL");
                if (url) document.execCommand("createLink", false, url);
              }}
            >
              Link
            </button>
          </div>
          <div
            className="border border-line px-2 py-2 min-h-[4rem] text-sm outline-none"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) =>
              onChange({ ...block, html: sanitizeBasicHtml(e.currentTarget.innerHTML) })
            }
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        </div>
      )}

      {block.type === "image" && (
        <div className="text-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt} className="max-h-28 mb-1" />
          <input
            className="w-full border border-line px-2 py-1 mb-1"
            value={block.alt}
            placeholder="Alt text"
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
          />
          <div className="break-all text-ink/40">{block.url}</div>
        </div>
      )}

      {block.type === "button" && (
        <div className="grid grid-cols-2 gap-1">
          <input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            className="border border-line px-2 py-1"
            placeholder="Label"
          />
          <input
            value={block.href}
            onChange={(e) => onChange({ ...block, href: e.target.value })}
            className="border border-line px-2 py-1"
            placeholder="/path or https://"
          />
        </div>
      )}

      {block.type === "divider" && <hr />}

      {block.type === "quote" && (
        <div className="space-y-1">
          <textarea
            rows={2}
            className="w-full border border-line px-2 py-1"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
          />
          <input
            className="w-full border border-line px-2 py-1"
            placeholder="Citation (optional)"
            value={block.cite || ""}
            onChange={(e) => onChange({ ...block, cite: e.target.value })}
          />
        </div>
      )}

      {block.type === "list" && (
        <div className="space-y-1">
          <label className="flex gap-2 text-xs">
            <input
              type="checkbox"
              checked={block.ordered}
              onChange={(e) => onChange({ ...block, ordered: e.target.checked })}
            />
            Numbered list
          </label>
          <textarea
            rows={4}
            className="w-full border border-line px-2 py-1 font-mono text-xs"
            value={block.items.join("\n")}
            placeholder="One item per line"
            onChange={(e) =>
              onChange({
                ...block,
                items: e.target.value.split("\n").filter((x) => x.length > 0),
              })
            }
          />
        </div>
      )}

      {block.type === "video" && (
        <input
          className="w-full border border-line px-2 py-1"
          placeholder="YouTube URL"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
        />
      )}

      {block.type === "columns" && (
        <div className="grid grid-cols-2 gap-2">
          <textarea
            rows={3}
            className="border border-line px-2 py-1"
            placeholder="Left column"
            value={block.left}
            onChange={(e) => onChange({ ...block, left: e.target.value })}
          />
          <textarea
            rows={3}
            className="border border-line px-2 py-1"
            placeholder="Right column"
            value={block.right}
            onChange={(e) => onChange({ ...block, right: e.target.value })}
          />
        </div>
      )}

      {block.type === "callout" && (
        <div className="space-y-1">
          <select
            value={block.tone}
            onChange={(e) =>
              onChange({ ...block, tone: e.target.value as "info" | "warn" | "success" })
            }
            className="border border-line text-xs"
          >
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="success">Success</option>
          </select>
          <textarea
            rows={2}
            className="w-full border border-line px-2 py-1"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export function CmsEditor({
  pages,
  theme,
  media: initialMedia,
}: {
  pages: Page[];
  theme: { primary: string; accent: string; font: string };
  media: Media[];
}) {
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(true);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [themeForm, setThemeForm] = useState(theme);
  const [media, setMedia] = useState(initialMedia);
  const [versions, setVersions] = useState<
    { id: string; title: string; createdAt: string }[]
  >([]);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  function loadPage(p: Page) {
    setEditId(p.id);
    setSlug(p.slug);
    setTitle(p.title);
    setPublished(p.published);
    setMetaTitle(p.metaTitle || "");
    setMetaDescription(p.metaDescription || "");
    setPublishAt(p.publishAt ? p.publishAt.slice(0, 16) : "");
    setBlocks(parseBlocks(p.body));
    fetch(`/api/cms?id=${p.id}`)
      .then((r) => r.json())
      .then((d) =>
        setVersions(
          (d.versions || []).map((v: { id: string; title: string; createdAt: string }) => ({
            id: v.id,
            title: v.title,
            createdAt: v.createdAt,
          }))
        )
      )
      .catch(() => setVersions([]));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    setBlocks(arrayMove(blocks, oldIndex, newIndex));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/cms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        title,
        body: JSON.stringify(blocks),
        published,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        publishAt: publishAt ? new Date(publishAt).toISOString() : null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Save failed");
      return;
    }
    setEditId(data.page.id);
    setMsg("Saved (+ history snapshot)");
    router.refresh();
    loadPage({
      ...data.page,
      publishAt: data.page.publishAt,
    });
  }

  async function saveTheme(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/cms/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(themeForm),
    });
    setMsg("Theme saved");
    router.refresh();
  }

  async function uploadMedia(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Upload failed");
      return;
    }
    setMedia((m) => [data.asset, ...m]);
    setBlocks((b) => [
      ...b,
      { id: newId(), type: "image", url: data.asset.url, alt: data.asset.filename },
    ]);
  }

  async function deleteMedia(id: string) {
    if (!confirm("Remove from library?")) return;
    await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    setMedia((m) => m.filter((x) => x.id !== id));
  }

  async function restore(versionId: string) {
    const res = await fetch("/api/cms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", versionId }),
    });
    const data = await res.json();
    if (res.ok) {
      loadPage(data.page);
      setMsg("Restored version");
      router.refresh();
    }
  }

  async function removePage(id: string) {
    if (!confirm("Delete page?")) return;
    await fetch(`/api/cms?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);

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
        <button type="submit" className="bg-navy text-paper py-2">
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
            placeholder="slug (home = homepage)"
            className="w-full border border-line px-3 py-2"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Title"
            className="w-full border border-line px-3 py-2"
          />

          <details className="border border-line p-2">
            <summary className="text-xs cursor-pointer">SEO & schedule</summary>
            <div className="space-y-2 mt-2">
              <input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Meta title"
                className="w-full border border-line px-2 py-1"
              />
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Meta description"
                rows={2}
                className="w-full border border-line px-2 py-1"
              />
              <label className="text-xs text-ink/50 block">
                Publish at (optional — page stays draft until then if set)
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  className="w-full border border-line px-2 py-1 mt-1"
                />
              </label>
            </div>
          </details>

          <div className="flex flex-wrap gap-1">
            {(
              [
                ["heading", () => ({ id: newId(), type: "heading" as const, text: "Heading", level: 2 as const })],
                ["paragraph", () => ({ id: newId(), type: "paragraph" as const, html: "" })],
                ["quote", () => ({ id: newId(), type: "quote" as const, text: "" })],
                ["list", () => ({ id: newId(), type: "list" as const, ordered: false, items: ["Item 1"] })],
                ["video", () => ({ id: newId(), type: "video" as const, url: "" })],
                ["columns", () => ({ id: newId(), type: "columns" as const, left: "", right: "" })],
                ["callout", () => ({ id: newId(), type: "callout" as const, text: "", tone: "info" as const })],
                ["button", () => ({ id: newId(), type: "button" as const, label: "Learn more", href: "/admissions" })],
                ["divider", () => ({ id: newId(), type: "divider" as const })],
              ] as const
            ).map(([label, factory]) => (
              <button
                key={label}
                type="button"
                className="border border-line px-2 py-1 text-xs capitalize"
                onClick={() => setBlocks((b) => [...b, factory()])}
              >
                + {label}
              </button>
            ))}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="max-h-[32rem] overflow-y-auto border border-line p-2">
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    onChange={(nb) => setBlocks((bs) => bs.map((x) => (x.id === nb.id ? nb : x)))}
                    onRemove={() => setBlocks((bs) => bs.filter((x) => x.id !== block.id))}
                  />
                ))}
                {blocks.length === 0 && (
                  <p className="text-ink/40 text-xs p-2">Add blocks or drag from media library</p>
                )}
              </div>
            </SortableContext>
          </DndContext>

          <label className="flex gap-2 items-center">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published (visible when schedule allows)
          </label>

          <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
            {busy ? "Saving…" : "Save page"}
          </button>

          {versions.length > 0 && (
            <div className="border-t border-line pt-2">
              <p className="text-xs uppercase text-ink/50 mb-1">History</p>
              <ul className="text-xs space-y-1 max-h-28 overflow-y-auto">
                {versions.map((v) => (
                  <li key={v.id} className="flex justify-between gap-2">
                    <span>{new Date(v.createdAt).toLocaleString()}</span>
                    <button type="button" className="underline" onClick={() => restore(v.id)}>
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>

        <div className="space-y-4">
          <section className="ledger-block">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-serif text-lg">Preview</h2>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  className={`px-2 py-1 border ${previewMode === "desktop" ? "border-navy" : "border-line"}`}
                  onClick={() => setPreviewMode("desktop")}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 border ${previewMode === "mobile" ? "border-navy" : "border-line"}`}
                  onClick={() => setPreviewMode("mobile")}
                >
                  Mobile
                </button>
              </div>
            </div>
            <div
              className={`border border-line p-4 min-h-[12rem] text-sm mx-auto transition-all ${
                previewMode === "mobile" ? "max-w-[360px]" : "max-w-none"
              }`}
              style={{
                fontFamily: themeForm.font === "sans" ? "system-ui,sans-serif" : "Georgia,serif",
                // @ts-expect-error css var
                "--cms-primary": themeForm.primary,
                "--cms-accent": themeForm.accent,
              }}
              dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) }}
            />
          </section>

          <section className="ledger-block">
            <h2 className="font-serif text-lg mb-2">Media library</h2>
            <label className="inline-block border border-line px-3 py-1.5 text-xs cursor-pointer mb-3">
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadMedia(f);
                }}
              />
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {media.map((m) => (
                <div key={m.id} className="border border-line p-1 text-[10px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt={m.filename}
                    className="h-16 w-full object-cover cursor-pointer"
                    onClick={() =>
                      setBlocks((b) => [
                        ...b,
                        { id: newId(), type: "image", url: m.url, alt: m.filename },
                      ])
                    }
                    title="Click to insert"
                  />
                  <button type="button" className="text-brick underline" onClick={() => deleteMedia(m.id)}>
                    Del
                  </button>
                </div>
              ))}
              {media.length === 0 && <p className="text-ink/40 col-span-full text-xs">No media yet (needs Blob token)</p>}
            </div>
          </section>

          <section className="ledger-block !p-0 overflow-x-auto">
            <div className="p-4 pb-0">
              <h2 className="font-serif text-lg">Pages</h2>
              <p className="text-xs text-ink/50">Slug <code>home</code> powers the public homepage</p>
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
                      <a
                        href={p.slug === "home" ? "/" : `/p/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {p.slug === "home" ? "/" : `/p/${p.slug}`}
                      </a>
                    </td>
                    <td className="text-xs space-x-2">
                      <button type="button" className="underline" onClick={() => loadPage(p)}>
                        Edit
                      </button>
                      <button type="button" className="text-brick underline" onClick={() => removePage(p.id)}>
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
