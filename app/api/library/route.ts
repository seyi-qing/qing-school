import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const BookSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().max(120).optional(),
  isbn: z.string().max(40).optional(),
  copies: z.coerce.number().int().min(1).default(1),
});

const LoanSchema = z.object({
  bookId: z.string(),
  studentId: z.string(),
  dueDate: z.string().optional(),
});

const ReturnSchema = z.object({
  loanId: z.string(),
});

function canManage(role: string) {
  return ["ADMIN", "IT", "SECRETARY", "TEACHER", "PRINCIPAL"].includes(role);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [books, openLoans] = await Promise.all([
    prisma.libraryBook.findMany({ orderBy: { title: "asc" } }),
    prisma.bookLoan.findMany({
      where: { returnedAt: null },
      include: {
        book: true,
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
      },
      orderBy: { borrowedAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({ books, openLoans });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  // Return a loan
  if (body?.loanId && body?.action === "return") {
    const parsed = ReturnSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const loan = await prisma.bookLoan.findUnique({ where: { id: parsed.data.loanId } });
    if (!loan || loan.returnedAt) {
      return NextResponse.json({ error: "Loan not found or already returned" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.bookLoan.update({
        where: { id: loan.id },
        data: { returnedAt: new Date() },
      }),
      prisma.libraryBook.update({
        where: { id: loan.bookId },
        data: { available: { increment: 1 } },
      }),
    ]);

    await logAudit({
      userId: session.userId,
      action: "RETURN_BOOK",
      entity: "BookLoan",
      entityId: loan.id,
    });
    return NextResponse.json({ ok: true });
  }

  // Issue a loan
  if (body?.bookId && body?.studentId) {
    const parsed = LoanSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid loan data" }, { status: 400 });

    const book = await prisma.libraryBook.findUnique({ where: { id: parsed.data.bookId } });
    if (!book || book.available < 1) {
      return NextResponse.json({ error: "No copies available" }, { status: 400 });
    }

    const due = parsed.data.dueDate
      ? new Date(parsed.data.dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const loan = await prisma.$transaction(async (tx) => {
      await tx.libraryBook.update({
        where: { id: book.id },
        data: { available: { decrement: 1 } },
      });
      return tx.bookLoan.create({
        data: {
          bookId: book.id,
          studentId: parsed.data.studentId,
          dueDate: due,
        },
      });
    });

    await logAudit({
      userId: session.userId,
      action: "ISSUE_BOOK",
      entity: "BookLoan",
      entityId: loan.id,
    });
    return NextResponse.json({ loan }, { status: 201 });
  }

  // Add book
  const parsed = BookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid book data" }, { status: 400 });
  }

  const book = await prisma.libraryBook.create({
    data: {
      title: parsed.data.title,
      author: parsed.data.author || null,
      isbn: parsed.data.isbn || null,
      copies: parsed.data.copies,
      available: parsed.data.copies,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "ADD_LIBRARY_BOOK",
    entity: "LibraryBook",
    entityId: book.id,
  });

  return NextResponse.json({ book }, { status: 201 });
}
