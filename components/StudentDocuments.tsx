"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Doc = { id: string; label: string; fileUrl: string; uploadedAt: string };

export function StudentDocuments({
  studentId,
  documents,
  canManage,
}: {
  studentId: string;
  documents: Doc[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const label = String(fd.get("label") || "");
    const file = fd.get("file");
    let fileUrl = String(fd.get("fileUrl") || "");

    try {
      if (file instanceof File && file.size > 0) {
        const up = new FormData();
        up.append("file", file);
        const upRes = await fetch("/api/uploads", { method: "POST", body: up });
        const upData = await upRes.json();
        if (!upRes.ok) {
          setError(upData.error || "Upload failed");
          setLoading(false);
          return;
        }
        fileUrl = upData.url;
      }

      if (!fileUrl) {
        setError("Provide a file or a URL");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, label, fileUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        setLoading(false);
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function remove(id: string) {
    if (!confirm("Remove this document?")) return;
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="ledger-block mt-6">
      <h2 className="font-serif text-lg mb-3">Documents</h2>
      <ul className="text-sm space-y-2 mb-4">
        {documents.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
            <div>
              <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-navy underline">
                {d.label}
              </a>
              <span className="text-xs text-ink/40 ml-2">
                {new Date(d.uploadedAt).toLocaleDateString()}
              </span>
            </div>
            {canManage && (
              <button type="button" onClick={() => remove(d.id)} className="text-xs text-brick underline">
                Remove
              </button>
            )}
          </li>
        ))}
        {documents.length === 0 && <li className="text-ink/50">No documents yet.</li>}
      </ul>

      {canManage && (
        <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-2 text-sm">
          {error && <p className="sm:col-span-2 text-brick text-xs">{error}</p>}
          <input name="label" required placeholder="Label" className="border border-line px-2 py-2" />
          <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="border border-line px-2 py-2 text-xs" />
          <input
            name="fileUrl"
            type="url"
            placeholder="Or paste https:// link"
            className="border border-line px-2 py-2 sm:col-span-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-2 bg-navy text-paper px-3 py-2 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Add document"}
          </button>
          <p className="sm:col-span-2 text-xs text-ink/40">
            Binary upload needs Vercel Blob token (BLOB_READ_WRITE_TOKEN). Otherwise use a Drive link.
          </p>
        </form>
      )}
    </section>
  );
}
