"use client";

import { useState } from "react";

export function ConfirmButton({
  label,
  confirmLabel = "Confirm",
  message,
  onConfirm,
  className = "text-sm border border-brick text-brick px-3 py-1.5 hover:bg-brick hover:text-paper",
  disabled,
}: {
  label: string;
  confirmLabel?: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }
  if (!open) {
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
    );
  }
  return (
    <div className="inline-flex flex-col gap-2 p-3 border border-line bg-paper text-sm max-w-xs">
      <p className="text-ink/80">{message}</p>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={run} className="bg-brick text-paper px-3 py-1.5 disabled:opacity-50">
          {busy ? "..." : confirmLabel}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className="underline text-ink/60">
          Cancel
        </button>
      </div>
    </div>
  );
}
