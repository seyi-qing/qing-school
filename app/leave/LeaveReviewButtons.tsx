"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LeaveReviewButtons({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function review(status: "APPROVED" | "REJECTED") {
    setLoading(true);
    await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => review("APPROVED")}
        className="text-xs bg-sage text-paper px-2 py-1 disabled:opacity-60"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => review("REJECTED")}
        className="text-xs border border-brick text-brick px-2 py-1 disabled:opacity-60"
      >
        Reject
      </button>
    </div>
  );
}
