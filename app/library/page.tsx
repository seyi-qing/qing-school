import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { redirect } from "next/navigation";
import { LibraryClient } from "./LibraryClient";

export const dynamic = "force-dynamic";

const ALLOWED = ["ADMIN", "IT", "SECRETARY", "TEACHER", "PRINCIPAL"];

export default async function LibraryPage() {
  const session = await requireSession();
  if (!ALLOWED.includes(session.role)) redirect(homeRouteForRole(session.role));

  const [books, openLoans, students] = await Promise.all([
    prisma.libraryBook.findMany({ orderBy: { title: "asc" } }),
    prisma.bookLoan.findMany({
      where: { returnedAt: null },
      include: {
        book: true,
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
      orderBy: { borrowedAt: "desc" },
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
    }),
  ]);

  return (
    <PortalShell role={session.role} title="Library" subtitle="Catalogue and loans">
      <LibraryClient
        books={books.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          copies: b.copies,
          available: b.available,
        }))}
        loans={openLoans.map((l) => ({
          id: l.id,
          bookTitle: l.book.title,
          studentName: `${l.student.firstName} ${l.student.lastName}`,
          admissionNumber: l.student.admissionNumber,
          borrowedAt: formatDate(l.borrowedAt),
          dueDate: l.dueDate ? formatDate(l.dueDate) : "-",
        }))}
        students={students.map((s) => ({
          id: s.id,
          label: `${s.lastName}, ${s.firstName} (${s.admissionNumber})`,
        }))}
      />
    </PortalShell>
  );
}
