"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

type Props = {
  studentId: string;
  admissionNumber: string;
  fullName: string;
  status: string;
  isAdmin: boolean;
  hasPaidFees: boolean;
};

export function StudentLifecycleActions({
  studentId,
  admissionNumber,
  fullName,
  status,
  isAdmin,
  hasPaidFees,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"withdraw" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [forceDelete, setForceDelete] = useState(false);

  async function withdraw() {
    if (!confirm(`Withdraw ${fullName}? They move to the Withdrawn list. Records are kept.`)) {
      return;
    }
    setBusy("withdraw");
    setError(null);
    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "WITHDRAWN" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      const msg = data.error ?? "Could not withdraw student.";
      setError(msg);
      toast(msg, "error");
      return;
    }
    toast("Student withdrawn.", "success");
    router.refresh();
  }

  async function reactivate() {
    setBusy("withdraw");
    setError(null);
    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      const msg = data.error ?? "Could not reactivate.";
      setError(msg);
      toast(msg, "error");
      return;
    }
    toast("Student reactivated.", "success");
    router.refresh();
  }

  async function doDelete() {
    if (confirmText.trim() !== admissionNumber) {
      setError(`Type the admission number exactly: ${admissionNumber}`);
      return;
    }
    setBusy("delete");
    setError(null);
    const res = await fetch(`/api/students/${studentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmAdmissionNumber: admissionNumber,
        force: forceDelete,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      const msg = data.error ?? "Could not delete student.";
      setError(msg);
      toast(msg, "error");
      return;
    }
    toast("Student deleted permanently.", "success");
    router.push("/students");
    router.refresh();
  }

  return (
    <div className="ledger-block space-y-3 border border-line">
      <h2 className="font-serif text-lg">Student lifecycle</h2>
      <p className="text-xs text-ink/55">
        Withdraw keeps history. Delete is permanent and only for duplicates or test records
        {isAdmin ? " (Admin/IT)." : "."}
      </p>

      {error && (
        <p className="text-sm text-brick border border-brick/30 bg-brick/5 px-3 py-2">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {status !== "WITHDRAWN" && status !== "GRADUATED" && (
          <button
            type="button"
            onClick={withdraw}
            disabled={!!busy}
            className="border border-ink/30 text-ink text-sm px-4 py-2 hover:bg-ink/5 disabled:opacity-60"
          >
            {busy === "withdraw" ? "…" : "Withdraw student"}
          </button>
        )}
        {status === "WITHDRAWN" && (
          <button
            type="button"
            onClick={reactivate}
            disabled={!!busy}
            className="border border-navy text-navy text-sm px-4 py-2 hover:bg-navy hover:text-paper disabled:opacity-60"
          >
            {busy === "withdraw" ? "…" : "Reactivate (ACTIVE)"}
          </button>
        )}
        {isAdmin && !showDelete && (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="border border-brick text-brick text-sm px-4 py-2 hover:bg-brick/5"
          >
            Delete permanently…
          </button>
        )}
      </div>

      {isAdmin && showDelete && (
        <div className="border border-brick/40 bg-brick/5 p-3 space-y-3">
          <p className="text-sm text-brick font-medium">
            Permanent delete — cannot be undone.
          </p>
          {hasPaidFees && (
            <p className="text-xs text-ink/70">
              This student has fee payments on record. Tick “force delete” only if you are sure
              (e.g. duplicate). Prefer Withdraw for real leavers.
            </p>
          )}
          <label className="block text-xs text-ink/70">
            Type admission number <span className="font-mono font-medium">{admissionNumber}</span> to
            confirm
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 w-full border border-line px-3 py-2 text-sm bg-white font-mono"
              placeholder={admissionNumber}
              autoComplete="off"
            />
          </label>
          {hasPaidFees && (
            <label className="flex items-center gap-2 text-xs text-ink/70">
              <input
                type="checkbox"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
              />
              Force delete even with payments (duplicate cleanup)
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={doDelete}
              disabled={!!busy || confirmText.trim() !== admissionNumber}
              className="bg-brick text-paper text-sm px-4 py-2 disabled:opacity-50"
            >
              {busy === "delete" ? "Deleting…" : "Delete forever"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDelete(false);
                setConfirmText("");
                setForceDelete(false);
                setError(null);
              }}
              className="border border-line text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
