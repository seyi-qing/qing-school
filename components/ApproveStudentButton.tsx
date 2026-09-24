"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApproveStudentButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    if (!confirm("Activate this applicant as an ACTIVE student?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not approve");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      alert("Network error");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={approve}
      disabled={loading}
      className="bg-sage text-paper text-xs px-3 py-1.5 hover:opacity-90 disabled:opacity-60"
    >
      {loading ? "…" : "Approve → Active"}
    </button>
  );
}
