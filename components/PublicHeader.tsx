import Link from "next/link";
import { Logo } from "./Logo";
import { SCHOOL } from "@/lib/school-config";

const NAV = [
  { href: "/admissions", label: "Admissions", priority: true },
  { href: "/result-checker", label: "Results", priority: false },
  { href: "/complaints", label: "Feedback", priority: false },
];

export function PublicHeader({ solid = true }: { solid?: boolean }) {
  return (
    <header
      className={`px-3 sm:px-6 md:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-40 ${
        solid ? "bg-navy text-paper shadow-sm" : "bg-navy/95 text-paper backdrop-blur"
      }`}
    >
      <Logo size="md" light className="min-w-0 shrink" />
      <nav className="flex items-center gap-1.5 sm:gap-4 md:gap-5 text-sm justify-end shrink-0">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`hover:text-gold transition-colors whitespace-nowrap ${
              item.priority
                ? "inline text-xs sm:text-sm px-1.5 sm:px-0"
                : "hidden sm:inline"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/login"
          className="border border-gold/80 text-gold px-2.5 sm:px-3.5 py-1.5 rounded-sm hover:bg-gold hover:text-navy transition-colors font-medium text-xs sm:text-sm whitespace-nowrap"
        >
          Portal Login
        </Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  const phones = [SCHOOL.contact.phone, SCHOOL.contact.phoneAlt, SCHOOL.contact.phoneAlt2]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer className="bg-navy text-paper/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 grid gap-8 grid-cols-1 sm:grid-cols-3">
        <div>
          <Logo size="md" light href="/" />
          <p className="mt-3 text-sm text-paper/60 leading-relaxed max-w-xs">
            {SCHOOL.tagline}
          </p>
        </div>
        <div>
          <p className="font-serif text-paper mb-3">Quick links</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/admissions" className="hover:text-gold">
                Online Admission
              </Link>
            </li>
            <li>
              <Link href="/result-checker" className="hover:text-gold">
                Result Checker
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-gold">
                Staff & Parent Portal
              </Link>
            </li>
            <li>
              <Link href="/complaints" className="hover:text-gold">
                Feedback & Complaints
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-serif text-paper mb-3">Contact</p>
          <ul className="space-y-2 text-sm text-paper/70">
            <li className="break-words">{SCHOOL.contact.address}</li>
            <li className="break-words">{phones}</li>
            <li>
              <a
                href={`mailto:${SCHOOL.contact.email}`}
                className="hover:text-gold break-all"
              >
                {SCHOOL.contact.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/10 px-4 sm:px-8 py-4 text-center text-xs text-paper/50">
        &copy; {new Date().getFullYear()} {SCHOOL.name}. {SCHOOL.motto}.
      </div>
    </footer>
  );
}
