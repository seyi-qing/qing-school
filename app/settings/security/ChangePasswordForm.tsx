"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { passwordPolicyHint } from "@/lib/password-policy";
import { useToast } from "@/components/ui/Toast";

export function ChangePasswordForm({
  forceMode = false,
  afterSuccessPath,
}: {
  forceMode?: boolean;
  afterSuccessPath?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: fd.get("currentPassword"),
        newPassword: fd.get("newPassword"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const err = data.error || "Failed";
      setMsg(err);
      toast(err, "error");
      return;
    }
    setOk(true);
    setMsg("Password changed.");
    toast("Password changed.", "success");
    (e.target as HTMLFormElement).reset();
    if (forceMode || afterSuccessPath) {
      const dest = data.redirectTo || afterSuccessPath || "/dashboard";
      router.push(dest);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm max-w-md">
      <p className="text-xs text-ink/60">{passwordPolicyHint()}</p>
      <label className="block">
        {forceMode ? "Temporary / current password" : "Current password"}
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full border border-line px-3 py-2"
        />
      </label>
      <label className="block">
        New password
        <input
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          className="mt-1 w-full border border-line px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="bg-navy text-paper px-4 py-2 disabled:opacity-50"
      >
        {busy ? "Saving..." : forceMode ? "Save and continue" : "Change password"}
      </button>
      {msg && <p className={ok ? "text-sage" : "text-brick"}>{msg}</p>}
    </form>
  );
}
