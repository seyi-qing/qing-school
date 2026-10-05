"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

/**
 * Role-based navigation.
 * One password entry only: /account/password (not also Settings → Security).
 */
const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "SECRETARY", "PRINCIPAL", "ACCOUNTANT"],
  },
  {
    href: "/platform",
    label: "Platform (SaaS)",
    roles: ["PLATFORM_ADMIN"],
  },
  {
    href: "/onboarding",
    label: "Onboard school",
    roles: ["PLATFORM_ADMIN"],
  },
  {
    href: "/account/password",
    label: "Change password",
    roles: [
      "PLATFORM_ADMIN",
      "ADMIN",
      "IT",
      "SECRETARY",
      "PRINCIPAL",
      "ACCOUNTANT",
      "TEACHER",
      "STUDENT",
      "PARENT",
    ],
  },

  { href: "/portal/student", label: "My Portal", roles: ["STUDENT"] },
  { href: "/portal/parent", label: "Family dashboard", roles: ["PARENT"] },
  { href: "/portal/teacher", label: "Teacher Portal", roles: ["TEACHER"] },
  { href: "/notices", label: "School notices", roles: ["PARENT"] },
  { href: "/result-checker", label: "Result checker", roles: ["PARENT"] },

  {
    href: "/students",
    label: "Students",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "SECRETARY", "PRINCIPAL", "TEACHER"],
  },
  {
    href: "/staff",
    label: "Staff",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT"],
  },
  {
    href: "/leave",
    label: "Staff Leave",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "PRINCIPAL", "TEACHER", "ACCOUNTANT", "SECRETARY"],
  },

  {
    href: "/classes",
    label: "Classes & Subjects",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT"],
  },
  {
    href: "/timetable",
    label: "Timetable",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "TEACHER", "PRINCIPAL"],
  },
  {
    href: "/attendance",
    label: "Attendance",
    roles: ["PLATFORM_ADMIN", "ADMIN", "TEACHER", "IT"],
  },
  {
    href: "/exams",
    label: "Scores / CA",
    roles: ["PLATFORM_ADMIN", "ADMIN", "TEACHER", "IT", "PRINCIPAL"],
  },
  {
    href: "/cbt",
    label: "CBT",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "TEACHER", "PRINCIPAL", "STUDENT"],
  },
  {
    href: "/reports",
    label: "Reports",
    roles: ["PLATFORM_ADMIN", "ADMIN", "PRINCIPAL", "IT"],
  },

  {
    href: "/fees",
    label: "Fees",
    roles: ["PLATFORM_ADMIN", "ADMIN", "ACCOUNTANT", "SECRETARY", "IT"],
  },
  {
    href: "/fees/structure",
    label: "Fee structure",
    roles: ["PLATFORM_ADMIN", "ADMIN", "ACCOUNTANT"],
  },
  {
    href: "/expenses",
    label: "Expenses",
    roles: ["PLATFORM_ADMIN", "ADMIN", "ACCOUNTANT"],
  },
  {
    href: "/payroll",
    label: "Payroll",
    roles: ["PLATFORM_ADMIN", "ADMIN", "ACCOUNTANT"],
  },

  {
    href: "/modules",
    label: "Modules hub",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "SECRETARY", "PRINCIPAL"],
  },
  {
    href: "/library",
    label: "Library",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "SECRETARY", "TEACHER", "PRINCIPAL"],
  },
  {
    href: "/hostel",
    label: "Hostel",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "SECRETARY", "PRINCIPAL"],
  },
  {
    href: "/transport",
    label: "Transport",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "SECRETARY", "PRINCIPAL", "ACCOUNTANT"],
  },
  {
    href: "/notices",
    label: "Notices",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "SECRETARY", "PRINCIPAL"],
  },
  {
    href: "/cms",
    label: "Website CMS",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT"],
  },

  {
    href: "/settings",
    label: "Admin Settings",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT"],
  },
  {
    href: "/settings/ops",
    label: "Ops / SMS / Backup",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT"],
  },
  {
    href: "/settings/audit",
    label: "Audit trail",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT"],
  },
  {
    href: "/settings/report-template",
    label: "Report designer",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT", "PRINCIPAL"],
  },
  {
    href: "/settings/go-live",
    label: "Go-live checklist",
    roles: ["PLATFORM_ADMIN", "ADMIN", "IT"],
  },
];

function rolePortalLabel(role: Role): string {
  switch (role) {
    case "PLATFORM_ADMIN":
      return "Platform admin portal";
    case "ADMIN":
      return "School admin portal";
    case "IT":
      return "IT portal";
    case "PRINCIPAL":
      return "Principal portal";
    case "SECRETARY":
      return "Secretary portal";
    case "ACCOUNTANT":
      return "Accounts portal";
    case "TEACHER":
      return "Teacher portal";
    case "STUDENT":
      return "Student portal";
    case "PARENT":
      return "Parent portal";
    default:
      return "Portal";
  }
}

export function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 max-w-full h-full max-h-dvh bg-navy text-paper flex flex-col no-print">
      <div className="px-5 py-4 border-b border-paper/10 flex items-start justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="KMS" className="w-10 h-10 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight">KMS</p>
            <p className="text-[11px] text-paper/50 truncate">{rolePortalLabel(role)}</p>
          </div>
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

      <nav className="flex-1 min-h-0 py-2 overflow-y-auto overscroll-contain">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={`${item.href}-${item.label}`}
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

      <div className="shrink-0 p-4 border-t border-paper/10 bg-navy">
        <button
          type="button"
          onClick={logout}
          className="w-full border border-paper/30 text-paper text-sm py-2.5 hover:border-gold hover:text-gold transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
