"use client";

import { FormEvent, useState } from "react";
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
      {msg && <p className="text-sm text-brick">{msg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Add book</h2>
          <form onSubmit={addBook} className="space-y-2 text-sm">
            <input name="title" required placeholder="Title" className="w-full border border-line px-3 py-2" />
            <input name="author" placeholder="Author" className="w-full border border-line px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <input name="isbn" placeholder="ISBN (optional)" className="border border-line px-3 py-2" />
              <input
                name="copies"
                type="number"
                min={1}
                defaultValue={1}
                className="border border-line px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-navy text-paper py-2 disabled:opacity-60"
            >
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
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-navy text-paper py-2 disabled:opacity-60"
            >
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
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.id}>
                <td className="font-medium">{b.title}</td>
                <td>{b.author ?? "-"}</td>
                <td>{b.copies}</td>
                <td>{b.available}</td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-ink/50 py-6">
                  No books yet.
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
            {loans.map((l) => (
              <tr key={l.id}>
                <td>{l.bookTitle}</td>
                <td>
                  {l.studentName}
                  <span className="text-xs text-ink/50 block">{l.admissionNumber}</span>
                </td>
                <td className="text-xs">{l.borrowedAt}</td>
                <td className="text-xs">{l.dueDate}</td>
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
            ))}
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
