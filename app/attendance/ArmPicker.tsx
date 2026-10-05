"use client";

import { useRouter } from "next/navigation";

export function ArmPicker({
  arms,
  selectedArmId,
}: {
  arms: { id: string; label: string }[];
  selectedArmId?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedArmId ?? ""}
      onChange={(e) => {
        const id = e.target.value;
        router.push(id ? `/attendance?armId=${encodeURIComponent(id)}` : "/attendance");
      }}
      className="border border-line px-3 py-2 text-sm bg-white mb-4"
    >
      {arms.length === 0 && <option value="">No classes</option>}
      {arms.map((a) => (
        <option key={a.id} value={a.id}>
          {a.label}
        </option>
      ))}
    </select>
  );
}
