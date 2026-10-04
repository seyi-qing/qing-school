import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const session = await requireSession();

  const [exams, books, rooms, routes, openLoans, pendingCbt] = await Promise.all([
    prisma.cbtExam.count(),
    prisma.libraryBook.count(),
    prisma.hostelRoom.count(),
    prisma.transportRoute.count(),
    prisma.bookLoan.count({ where: { returnedAt: null } }),
    prisma.cbtAttempt.count({ where: { needsGrading: true } }),
  ]);

  const cards = [
    {
      href: "/cbt",
      title: "CBT / Computer tests",
      blurb: "Timed MCQ & essay tests, question bank, proctoring, results.",
      meta: `${exams} exams · ${pendingCbt} pending grades`,
      roles: ["ADMIN", "IT", "TEACHER", "PRINCIPAL", "STUDENT"],
    },
    {
      href: "/library",
      title: "Library",
      blurb: "Catalogue, issue & return, overdue tracking, search.",
      meta: `${books} books · ${openLoans} open loans`,
      roles: ["ADMIN", "IT", "SECRETARY", "TEACHER", "PRINCIPAL"],
    },
    {
      href: "/hostel",
      title: "Hostel",
      blurb: "Rooms, beds, gender capacity, allocate & vacate.",
      meta: `${rooms} rooms`,
      roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL"],
    },
    {
      href: "/transport",
      title: "Transport",
      blurb: "Bus routes, drivers, enroll riders, bill termly fee.",
      meta: `${routes} routes`,
      roles: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "ACCOUNTANT"],
    },
    {
      href: "/settings/report-template",
      title: "Report designer",
      blurb: "Logo, colours, section order, freeform prototype.",
      meta: "Print templates",
      roles: ["ADMIN", "IT", "PRINCIPAL"],
    },
  ].filter((c) => c.roles.includes(session.role));

  return (
    <PortalShell
      role={session.role}
      title="Advanced modules"
      subtitle="Phase 4 — CBT, library, hostel, transport, reports"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="ledger-block hover:border-navy transition-colors block"
          >
            <h2 className="font-serif text-lg text-navy">{c.title}</h2>
            <p className="text-sm text-ink/70 mt-1">{c.blurb}</p>
            <p className="text-xs text-ink/45 mt-3">{c.meta}</p>
          </Link>
        ))}
      </div>
      {cards.length === 0 && (
        <p className="text-sm text-ink/50">No advanced modules available for your role.</p>
      )}
    </PortalShell>
  );
}
