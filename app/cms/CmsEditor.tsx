"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Page = {
  id: string;
  slug: string;
  title: string;
  body: string;
  published: boolean;
};

export function CmsEditor({ pages }: { pages: Page[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState<Page | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/cms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: fd.get("slug"),
        title: fd.get("title"),
        body: fd.get("body"),
        published: fd.get("published") === "on",
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(typeof data.error === "string" ? data.error : "Save failed");
      return;
    }
    setEdit(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this page?")) return;
    await fetch(`/api/cms?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="ledger-block">
        <h2 className="font-serif text-lg mb-3">{edit ? "Edit page" : "New page"}</h2>
        {msg && <p className="text-sm text-brick mb-2">{msg}</p>}
        <form onSubmit={save} className="space-y-2 text-sm">
          <input
            name="slug"
            required
            defaultValue={edit?.slug}
            placeholder="slug (e.g. about)"
            className="w-full border border-line px-3 py-2"
          />
          <input
            name="title"
            required
            defaultValue={edit?.title}
            placeholder="Title"
            className="w-full border border-line px-3 py-2"
          />
          <textarea
            name="body"
            required
            rows={10}
            defaultValue={edit?.body}
            placeholder="Page body (plain text or simple HTML)"
            className="w-full border border-line px-3 py-2 font-mono text-xs"
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="published" defaultChecked={edit?.published ?? true} />
            Published (visible on public site)
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="bg-navy text-paper px-4 py-2 disabled:opacity-60">
              {busy ? "Saving…" : "Save"}
            </button>
            {edit && (
              <button type="button" onClick={() => setEdit(null)} className="border border-line px-4 py-2">
                Cancel
              </button>
            )}
          </div>
          <p className="text-xs text-ink/40">Public URL: /p/your-slug</p>
        </form>
      </section>

      <section className="ledger-block !p-0 overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-serif text-lg">Pages</h2>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td className="font-mono text-xs">
                  <a href={`/p/${p.slug}`} className="underline" target="_blank" rel="noreferrer">
                    /p/{p.slug}
                  </a>
                </td>
                <td>{p.published ? "Live" : "Draft"}</td>
                <td className="space-x-2 text-xs">
                  <button type="button" className="underline" onClick={() => setEdit(p)}>
                    Edit
                  </button>
                  <button type="button" className="text-brick underline" onClick={() => remove(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-ink/50 py-6">
                  No pages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
