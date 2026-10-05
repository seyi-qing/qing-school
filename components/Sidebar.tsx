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
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "ACCOUNTANT"] },
  { href: "/portal/student", label: "My Portal", roles: ["STUDENT"] },
  { href: "/portal/parent", label: "Family dashboard", roles: ["PARENT"] },
  {
    href: "/account/password",
    label: "Change password",
    roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "ACCOUNTANT", "TEACHER", "STUDENT", "PARENT"],
  },
  { href: "/notices", label: "School notices", roles: ["PARENT"] },
  { href: "/result-checker", label: "Result checker", roles: ["PARENT"] },
  { href: "/portal/teacher", label: "Teacher Portal", roles: ["TEACHER"] },
  { href: "/students", label: "Students", roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "TEACHER"] },
  { href: "/staff", label: "Staff", roles: ["ADMIN", "IT"] },
  { href: "/leave", label: "Staff Leave", roles: ["ADMIN", "IT", "PRINCIPAL", "TEACHER", "ACCOUNTANT", "SECRETARY"] },
  { href: "/payroll", label: "Payroll", roles: ["ADMIN", "ACCOUNTANT"] },
  { href: "/classes", label: "Classes & Subjects", roles: ["ADMIN", "IT"] },
  { href: "/timetable", label: "Timetable", roles: ["ADMIN", "IT", "TEACHER", "PRINCIPAL"] },
  { href: "/modules", label: "Modules hub", roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "TEACHER", "ACCOUNTANT"] },
  { href: "/cbt", label: "CBT", roles: ["ADMIN", "IT", "TEACHER", "PRINCIPAL", "STUDENT"] },
  { href: "/library", label: "Library", roles: ["ADMIN", "IT", "SECRETARY", "TEACHER", "PRINCIPAL"] },
  { href: "/hostel", label: "Hostel", roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL"] },
  { href: "/transport", label: "Transport", roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "ACCOUNTANT"] },
  { href: "/attendance", label: "Attendance", roles: ["ADMIN", "TEACHER", "IT"] },
  { href: "/exams", label: "Scores / CA", roles: ["ADMIN", "TEACHER", "IT", "PRINCIPAL"] },
  { href: "/fees", label: "Fees", roles: ["ADMIN", "ACCOUNTANT", "SECRETARY", "IT"] },
  { href: "/expenses", label: "Expenses", roles: ["ADMIN", "ACCOUNTANT"] },
  { href: "/notices", label: "Notices", roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL"] },
  { href: "/cms", label: "Website CMS", roles: ["ADMIN", "IT"] },
  { href: "/reports", label: "Reports", roles: ["ADMIN", "PRINCIPAL", "IT"] },
  { href: "/settings", label: "Settings", roles: ["ADMIN", "IT", "PRINCIPAL"] },
  { href: "/platform", label: "Platform", roles: ["PLATFORM_ADMIN"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 border-r border-line bg-white min-h-screen p-4 hidden md:block">
      <p className="font-serif text-lg text-navy mb-4">KMS</p>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`block text-sm px-3 py-2 rounded ${
                active ? "bg-navy text-paper" : "text-ink/80 hover:bg-paper"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={signOut}
        className="mt-6 text-xs text-ink/50 underline hover:text-navy"
      >
        Sign out
      </button>
    </aside>
  );
}
