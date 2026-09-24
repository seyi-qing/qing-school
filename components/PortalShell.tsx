"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function PortalShell({
  role,
  title,
  subtitle,
  actions,
  children,
}: {
  role: Role;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <div className="hidden lg:flex lg:shrink-0 lg:h-screen lg:sticky lg:top-0">
        <Sidebar role={role} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full max-h-dvh w-[min(18rem,85vw)] shadow-xl">
            <Sidebar role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-line bg-paper px-4 sm:px-6 lg:px-8 py-3 sm:py-5 flex items-start sm:items-center justify-between gap-3 no-print sticky top-0 z-30">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden mt-0.5 shrink-0 w-10 h-10 flex flex-col items-center justify-center gap-1.5 border border-line bg-white"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <span className="block w-5 h-0.5 bg-navy" />
              <span className="block w-5 h-0.5 bg-navy" />
              <span className="block w-5 h-0.5 bg-navy" />
            </button>
            <div className="min-w-0">
              <h1 className="font-serif text-xl sm:text-2xl text-ink leading-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-ink/60 mt-0.5 break-all sm:break-normal">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="shrink-0 flex flex-wrap gap-2 items-center justify-end">
            {actions}
            {/* Always-visible sign out on small screens (drawer button stays as backup) */}
            <button
              type="button"
              onClick={logout}
              className="lg:hidden text-xs border border-line px-2.5 py-1.5 text-ink/70 hover:border-navy hover:text-navy"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function StatBlock({
  label,
  value,
  sublabel,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "positive" | "warning";
}) {
  const toneClass =
    tone === "positive" ? "text-sage" : tone === "warning" ? "text-brick" : "text-ink";
  return (
    <div className="ledger-block h-full">
      <p className="text-[10px] sm:text-xs uppercase tracking-wide text-ink/50 leading-snug">{label}</p>
      <p className={`ledger-number text-2xl sm:text-3xl mt-1 break-words ${toneClass}`}>{value}</p>
      {sublabel && <p className="text-[10px] sm:text-xs text-ink/50 mt-1">{sublabel}</p>}
    </div>
  );
}
