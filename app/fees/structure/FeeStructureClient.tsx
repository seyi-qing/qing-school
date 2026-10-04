"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Arm = { id: string; label: string };
type Term = { id: string; name: string; isCurrent: boolean };
type Item = {
  id: string;
  name: string;
  amount: number;
  compulsory: boolean;
  armId: string;
  termId: string;
};

export function FeeStructureClient({
  arms,
  terms,
  items: initial,
}: {
  arms: Arm[];
  terms: Term[];
  items: Item[];
}) {
  const router = useRouter();
  const [armId, setArmId] = useState(arms[0]?.id || "");
  const [termId, setTermId] = useState(terms.find((t) => t.isCurrent)?.id || terms[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const filtered = initial.filter((i) => i.armId === armId && i.termId === termId);

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        armId,
        termId,
        name: fd.get("name"),
        amount: Number(fd.get("amount")),
        compulsory: fd.get("compulsory") === "on",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed to add fee item");
      return;
    }
    setOk(true);
    setMsg("Fee item added.");
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function generateInvoices() {
    if (!armId || !termId) return;
    if (
      !window.confirm(
        "Generate term invoices for all ACTIVE students in this class from compulsory fee items? Existing invoices for this term are skipped."
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg("");
    setOk(false);
    const res = await fetch("/api/fees/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ armId, termId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Generate failed");
      return;
    }
    setOk(true);
    setMsg(`Created ${data.created ?? 0} invoice(s).`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Class / Arm
          <select
            className="block mt-1 border border-line px-3 py-2 bg-white"
            value={armId}
            onChange={(e) => setArmId(e.target.value)}
          >
            {arms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Term
          <select
            className="block mt-1 border border-line px-3 py-2 bg-white"
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isCurrent ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || filtered.length === 0}
          onClick={generateInvoices}
          className="bg-navy text-paper px-4 py-2 text-sm disabled:opacity-50"
        >
          Generate invoices for class
        </button>
      </div>

      {msg && <p className={`text-sm ${ok ? "text-sage" : "text-brick"}`}>{msg}</p>}

      <section className="ledger-block !p-0 overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-serif text-lg">Fee items for selection</h2>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
              <th>Compulsory</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.amount.toLocaleString("en-NG")}</td>
                <td>{i.compulsory ? "Yes" : "Optional"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-ink/50 py-6">
                  No fee items for this class/term. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="ledger-block max-w-lg">
        <h2 className="font-serif text-lg mb-3">Add fee item</h2>
        <form onSubmit={addItem} className="space-y-3 text-sm">
          <label className="block">
            Name (e.g. Tuition, PTA, Uniform)
            <input name="name" required className="mt-1 w-full border border-line px-3 py-2" />
          </label>
          <label className="block">
            Amount (NGN)
            <input
              name="amount"
              type="number"
              min={1}
              step="0.01"
              required
              className="mt-1 w-full border border-line px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2">
            <input name="compulsory" type="checkbox" defaultChecked />
            Compulsory (included when generating invoices)
          </label>
          <button
            type="submit"
            disabled={busy || !armId || !termId}
            className="bg-navy text-paper px-4 py-2 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Add fee item"}
          </button>
        </form>
      </section>
    </div>
  );
}
