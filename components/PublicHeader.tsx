import Link from "next/link";
import { Logo } from "./Logo";
import { SCHOOL } from "@/lib/school-config";

const NAV = [
  { href: "/admissions", label: "Admissions" },
  { href: "/result-checker", label: "Results" },
  { href: "/complaints", label: "Feedback" },
];

export function PublicHeader({ solid = true }: { solid?: boolean }) {
  return (
    <header
      className={`px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-40 ${
        solid ? "bg-navy text-paper shadow-sm" : "bg-navy/95 text-paper backdrop-blur"
      }`}
    >
      <Logo size="md" light />
      <nav className="flex flex-wrap items-center gap-2 sm:gap-5 text-sm justify-end">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:text-gold transition-colors hidden xs:inline sm:inline"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/login"
          className="border border-gold/80 text-gold px-3.5 py-1.5 rounded-sm hover:bg-gold hover:text-navy transition-colors font-medium"
        >
          Portal Login
        </Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-navy text-paper/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <Logo size="md" light href="/" />
          <p className="mt-3 text-sm text-paper/60 leading-relaxed max-w-xs">
            {SCHOOL.tagline}. Located in {SCHOOL.location}.
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
            <li>{SCHOOL.contact.address}</li>
            <li>{SCHOOL.contact.phone}</li>
            <li>
              <a href={`mailto:${SCHOOL.contact.email}`} className="hover:text-gold">
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
