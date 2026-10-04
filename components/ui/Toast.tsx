"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; message: string; kind: ToastKind };

const ToastCtx = createContext<{ toast: (message: string, kind?: ToastKind) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm no-print">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`text-sm px-4 py-3 shadow-lg border bg-white ${
              t.kind === "success" ? "border-sage" : t.kind === "error" ? "border-brick" : "border-navy"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) return { toast: (m: string) => { if (typeof window !== "undefined") window.alert(m); } };
  return ctx;
}
