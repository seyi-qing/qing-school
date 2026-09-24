"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApproveStudentButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={approve}
      disabled={loading}
      className="text-xs sm:text-sm bg-sage text-paper px-3 py-1.5 disabled:opacity-60 whitespace-nowrap"
    >
      {loading ? "…" : "Approve (ACTIVE)"}
    </button>
  );
}
