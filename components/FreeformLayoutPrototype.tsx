"use client";

import { useRef, useState } from "react";

export type FreeformBlock = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const DEFAULT_BLOCKS: FreeformBlock[] = [
  { id: "header", label: "Header / logo", x: 20, y: 16, w: 360, h: 72 },
  { id: "info", label: "Student info", x: 20, y: 100, w: 360, h: 56 },
  { id: "scores", label: "Scores table", x: 20, y: 168, w: 360, h: 120 },
  { id: "sign", label: "Signatures", x: 20, y: 300, w: 360, h: 48 },
];

type Props = {
  value?: FreeformBlock[];
  onChange: (blocks: FreeformBlock[]) => void;
};

export function FreeformLayoutPrototype({ value, onChange }: Props) {
  const [blocks, setBlocks] = useState<FreeformBlock[]>(value?.length ? value : DEFAULT_BLOCKS);
  const drag = useRef<{ id: string; ox: number; oy: number } | null>(null);

  function commit(next: FreeformBlock[]) {
    setBlocks(next);
    onChange(next);
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id, ox: e.clientX - b.x, oy: e.clientY - b.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const { id, ox, oy } = drag.current;
    const x = Math.max(0, Math.min(400 - 40, e.clientX - ox));
    const y = Math.max(0, Math.min(420 - 20, e.clientY - oy));
    commit(blocks.map((b) => (b.id === id ? { ...b, x, y } : b)));
  }

  function onPointerUp() {
    drag.current = null;
  }

  function reset() {
    commit(DEFAULT_BLOCKS);
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-xs uppercase text-ink/50">Freeform prototype (experimental)</p>
        <button type="button" onClick={reset} className="text-xs underline text-navy">
          Reset positions
        </button>
      </div>
      <p className="text-[10px] text-ink/45">
        Drag blocks on the canvas. Positions are saved with the template. This is a prototype — not a full
        page builder.
      </p>
      <div
        className="relative border border-line bg-[#faf9f6] overflow-hidden select-none"
        style={{ height: 420, maxWidth: 420 }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {blocks.map((b) => (
          <div
            key={b.id}
            onPointerDown={(e) => onPointerDown(e, b.id)}
            className="absolute border-2 border-navy/40 bg-white/90 shadow-sm cursor-grab active:cursor-grabbing flex items-center justify-center text-[11px] font-medium text-navy px-1"
            style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
          >
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
