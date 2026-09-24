"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NoticeForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title"),
      body: form.get("body"),
      audience: form.get("audience"),
      publishToWeb: form.get("publishToWeb") === "on",
      alsoSendSms: form.get("alsoSendSms") === "on",
    };
    await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="ledger-block space-y-3">
      <h2 className="font-serif text-lg">Post a Notice</h2>
      <input name="title" required placeholder="Title" className="w-full border border-line px-3 py-2 text-sm" />
      <textarea name="body" required rows={4} placeholder="Message" className="w-full border border-line px-3 py-2 text-sm" />
      <select name="audience" className="w-full border border-line px-3 py-2 text-sm">
        <option value="ALL">Everyone</option>
        <option value="STAFF">Staff only</option>
        <option value="STUDENTS">Students only</option>
        <option value="PARENTS">Parents only</option>
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publishToWeb" /> Also publish on public website
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="alsoSendSms" /> Also send as SMS
      </label>
      <button type="submit" disabled={submitting} className="w-full bg-navy text-paper text-sm py-2.5 disabled:opacity-60">
        {submitting ? "Posting..." : "Post Notice"}
      </button>
    </form>
  );
}
