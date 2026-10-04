"use client";

import { FormEvent, useState, Fragment } from "react";
import { useRouter } from "next/navigation";

type Book = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  copies: number;
  available: number;
};

type Loan = {
  id: string;
  bookTitle: string;
  studentName: string;
  admissionNumber: string;
  borrowedAt: string;
  dueDate: string;
};

export function LibraryClient({
  books,
  loans,
  students,
}: {
  books: Book[];
  loans: Loan[];
  students: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredBooks = books.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.title.toLowerCase().includes(q) ||
      (b.author || "").toLowerCase().includes(q) ||
      (b.isbn || "").toLowerCase().includes(q)
    );
  });

  const overdue = loans.filter((l) => l.dueDate && new Date(l.dueDate) < new Date());

  async function addBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        author: fd.get("author") || undefined,
        isbn: fd.get("isbn") || undefined,
        copies: fd.get("copies"),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function saveBook(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/library", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: fd.get("title"),
        author: fd.get("author") || null,
        isbn: fd.get("isbn") || null,
        copies: fd.get("copies"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed to update book");
      return;
    }
    setMsg("Book updated.");
    setEditingId(null);
    router.refresh();
  }

  async function deleteBook(id: string, title: string) {
    if (!confirm(`Delete “${title}”? Only if no open loans.`)) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/library", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not delete");
      return;
    }
    setMsg("Book deleted.");
    router.refresh();
  }

  async function issue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: fd.get("bookId"),
        studentId: fd.get("studentId"),
        dueDate: fd.get("dueDate") || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function returnLoan(loanId: string) {
    setBusy(true);
    await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loanId, action: "return" }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`text-sm ${msg.includes("updated") || msg.includes("deleted") ? "text-sage" : "text-brick"}`}>
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search books by title, author, ISBN…"
          className="border border-line px-3 py-2 text-sm w-full sm:w-80 bg-white"
        />
        {overdue.length > 0 && (
          <span className="text-xs text-brick border border-brick/40 px-2 py-1">
            {overdue.length} overdue loan(s)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Add book</h2>
          <form onSubmit={addBook} className="space-y-2 text-sm">
            <input name="title" required placeholder="Title" className="w-full border border-line px-3 py-2" />
            <input name="author" placeholder="Author" className="w-full border border-line px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <input name="isbn" placeholder="ISBN (optional)" className="border border-line px-3 py-2" />
              <input name="copies" type="number" min={1} defaultValue={1} className="border border-line px-3 py-2" />
            </div>
            <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
              {busy ? "…" : "Add to catalogue"}
            </button>
          </form>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Issue book</h2>
          <form onSubmit={issue} className="space-y-2 text-sm">
            <select name="bookId" required className="w-full border border-line px-3 py-2 bg-white">
              <option value="">Select book</option>
              {books
                .filter((b) => b.available > 0)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.available} left)
                  </option>
                ))}
            </select>
            <select name="studentId" required className="w-full border border-line px-3 py-2 bg-white">
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <input name="dueDate" type="date" className="w-full border border-line px-3 py-2" />
            <button type="submit" disabled={busy} className="w-full bg-navy text-paper py-2 disabled:opacity-60">
              {busy ? "…" : "Issue (14 days if no due date)"}
            </button>
          </form>
        </section>
      </div>

      <section className="ledger-block !p-0 overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-serif text-lg">Catalogue</h2>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Copies</th>
              <th>Available</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredBooks.map((b) => (
              <Fragment key={b.id}>
                <tr>
                  <td className="font-medium">{b.title}</td>
                  <td>{b.author ?? "-"}</td>
                  <td>{b.copies}</td>
                  <td>{b.available}</td>
                  <td className="text-xs space-x-2 whitespace-nowrap">
                    <button type="button" className="underline text-navy" onClick={() => setEditingId(editingId === b.id ? null : b.id)}>
                      {editingId === b.id ? "Cancel" : "Edit"}
                    </button>
                    <button type="button" className="underline text-brick" disabled={busy} onClick={() => deleteBook(b.id, b.title)}>
                      Delete
                    </button>
                  </td>
                </tr>
                {editingId === b.id && (
                  <tr>
                    <td colSpan={5} className="bg-navy/5">
                      <form onSubmit={(e) => saveBook(e, b.id)} className="flex flex-wrap gap-2 p-2 text-sm items-end">
                        <label className="text-xs">
                          Title
                          <input name="title" required defaultValue={b.title} className="block border border-line px-2 py-1 bg-white min-w-[10rem]" />
                        </label>
                        <label className="text-xs">
                          Author
                          <input name="author" defaultValue={b.author ?? ""} className="block border border-line px-2 py-1 bg-white" />
                        </label>
                        <label className="text-xs">
                          ISBN
                          <input name="isbn" defaultValue={b.isbn ?? ""} className="block border border-line px-2 py-1 bg-white" />
                        </label>
                        <label className="text-xs">
                          Copies
                          <input name="copies" type="number" min={1} defaultValue={b.copies} className="block border border-line px-2 py-1 bg-white w-20" />
                        </label>
                        <button type="submit" disabled={busy} className="bg-navy text-paper text-xs px-3 py-1.5 disabled:opacity-50">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filteredBooks.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink/50 py-6">
                  No books match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="ledger-block !p-0 overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-serif text-lg">Open loans</h2>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>Book</th>
              <th>Student</th>
              <th>Borrowed</th>
              <th>Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => {
              const isOverdue = !!(l.dueDate && new Date(l.dueDate) < new Date());
              return (
                <tr key={l.id} className={isOverdue ? "bg-brick/5" : undefined}>
                  <td>{l.bookTitle}</td>
                  <td>
                    {l.studentName}
                    <span className="text-xs text-ink/50 block">{l.admissionNumber}</span>
                  </td>
                  <td className="text-xs">{l.borrowedAt}</td>
                  <td className={`text-xs ${isOverdue ? "text-brick font-medium" : ""}`}>
                    {l.dueDate || "—"}
                    {isOverdue ? " (overdue)" : ""}
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => returnLoan(l.id)}
                      className="text-xs border border-navy text-navy px-2 py-1 disabled:opacity-60"
                    >
                      Return
                    </button>
                  </td>
                </tr>
              );
            })}
            {loans.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink/50 py-6">
                  No open loans.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
