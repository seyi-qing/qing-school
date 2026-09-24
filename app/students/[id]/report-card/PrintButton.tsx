"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="border border-navy text-navy text-sm px-4 py-2 hover:bg-navy hover:text-paper"
    >
      Print / Save as PDF
    </button>
  );
}
