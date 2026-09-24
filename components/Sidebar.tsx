"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";

interface NavItem {
  href: string;
  label: string;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students", roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "TEACHER"] },
  { href: "/staff", label: "Staff", roles: ["ADMIN", "IT"] },
  { href: "/leave", label: "Staff Leave", roles: ["ADMIN", "IT", "PRINCIPAL", "TEACHER", "ACCOUNTANT", "SECRETARY"] },
  { href: "/payroll", label: "Payroll", roles: ["ADMIN", "ACCOUNTANT"] },
  { href: "/classes", label: "Classes & Subjects", roles: ["ADMIN", "IT"] },
  { href: "/timetable", label: "Timetable", roles: ["ADMIN", "IT", "TEACHER", "PRINCIPAL"] },
  { href: "/attendance", label: "Attendance", roles: ["ADMIN", "TEACHER", "IT"] },
  { href: "/exams", label: "Exams & Results", roles: ["ADMIN", "TEACHER", "PRINCIPAL"] },
  { href: "/fees", label: "Fees & Accounts", roles: ["ADMIN", "ACCOUNTANT", "SECRETARY"] },
  { href: "/expenses", label: "Expenses", roles: ["ADMIN", "ACCOUNTANT"] },
  { href: "/notices", label: "Communication", roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL"] },
  { href: "/reports", label: "Reports", roles: ["ADMIN", "IT", "PRINCIPAL", "ACCOUNTANT", "SECRETARY"] },
  { href: "/settings", label: "Admin Settings", roles: ["ADMIN", "IT"] },
];

export function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const visible = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 max-w-full h-full min-h-screen bg-navy text-paper flex flex-col no-print">
      <div className="px-5 py-5 border-b border-paper/10 flex items-start justify-between gap-2">
        <div>
          <div className="w-9 h-9 border-2 border-gold flex items-center justify-center font-serif text-gold text-sm mb-2">
            FS
          </div>
          <p className="font-serif text-lg leading-tight">Force Schools</p>
          <p className="text-[11px] text-paper/50">
            {role.charAt(0) + role.slice(1).toLowerCase()} Portal
          </p>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            className="lg:hidden text-paper/70 hover:text-gold text-2xl leading-none px-1"
            aria-label="Close menu"
          >
            &times;
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`block px-5 py-2.5 text-sm border-l-2 ${
                active
                  ? "border-gold bg-white/5 text-gold"
                  : "border-transparent text-paper/75 hover:bg-white/5 hover:text-paper"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={logout}
        className="m-4 mt-0 border border-paper/20 text-paper/80 text-sm py-2 hover:border-gold hover:text-gold transition-colors"
      >
        Sign out
      </button>
    </aside>
  );
}
