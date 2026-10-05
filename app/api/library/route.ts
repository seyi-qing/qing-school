import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";

const BookSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().max(120).optional().nullable(),
  isbn: z.string().max(40).optional().nullable(),
  copies: z.coerce.number().int().min(1).default(1),
});

const UpdateBookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  author: z.string().max(120).optional().nullable(),
  isbn: z.string().max(40).optional().nullable(),
  copies: z.coerce.number().int().min(1),
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

  const schoolId = await resolveSchoolId(session);
  const [books, openLoans] = await Promise.all([
    prisma.libraryBook.findMany({ where: schoolWhere(schoolId), orderBy: { title: "asc" } }),
    prisma.bookLoan.findMany({
      where: { returnedAt: null, ...(schoolId ? { book: { schoolId } } : {}) },
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

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateBookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid book data" }, { status: 400 });
  }

  const book = await prisma.libraryBook.findUnique({ where: { id: parsed.data.id } });
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const onLoan = book.copies - book.available;
  if (parsed.data.copies < onLoan) {
    return NextResponse.json(
      { error: `Cannot set copies below books currently on loan (${onLoan}).` },
      { status: 400 }
    );
  }

  const available = parsed.data.copies - onLoan;
  const updated = await prisma.libraryBook.update({
    where: { id: book.id },
    data: {
      title: parsed.data.title.trim(),
      author: parsed.data.author?.trim() || null,
      isbn: parsed.data.isbn?.trim() || null,
      copies: parsed.data.copies,
      available,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "UPDATE_LIBRARY_BOOK",
    entity: "LibraryBook",
    entityId: updated.id,
  });

  return NextResponse.json({ book: updated });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "Book id required" }, { status: 400 });

  const open = await prisma.bookLoan.count({ where: { bookId: id, returnedAt: null } });
  if (open > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${open} open loan(s). Return books first.` },
      { status: 409 }
    );
  }

  await prisma.libraryBook.delete({ where: { id } });
  await logAudit({
    userId: session.userId,
    action: "DELETE_LIBRARY_BOOK",
    entity: "LibraryBook",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

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

  const parsed = BookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid book data" }, { status: 400 });
  }

  const schoolId = await resolveSchoolId(session);
  const book = await prisma.libraryBook.create({
    data: {
      schoolId: schoolId ?? undefined,
      title: parsed.data.title.trim(),
      author: parsed.data.author?.trim() || null,
      isbn: parsed.data.isbn?.trim() || null,
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
