import type { Role } from "@prisma/client";
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
  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <div className="flex-1 min-w-0">
        <header className="border-b border-line bg-paper px-8 py-5 flex items-center justify-between no-print">
          <div>
            <h1 className="font-serif text-2xl text-ink">{title}</h1>
            {subtitle && <p className="text-sm text-ink/60 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <main className="px-8 py-6">{children}</main>
      </div>
    </div>
  );
}

/** A single ledger-style stat block for dashboards. */
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
    <div className="ledger-block">
      <p className="text-xs uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`ledger-number text-3xl mt-1 ${toneClass}`}>{value}</p>
      {sublabel && <p className="text-xs text-ink/50 mt-1">{sublabel}</p>}
    </div>
  );
}
