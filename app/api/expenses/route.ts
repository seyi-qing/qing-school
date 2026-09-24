import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const CreateSchema = z.object({
  category: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  amount: z.coerce.number().positive(),
  date: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_EXPENSES")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expenses = await prisma.expenseRecord.findMany({
    orderBy: { date: "desc" },
    take: 200,
  });

  const incomeAgg = await prisma.payment.aggregate({
    where: { status: "SUCCESS" },
    _sum: { amount: true },
  });
  const expenseAgg = await prisma.expenseRecord.aggregate({ _sum: { amount: true } });

  return NextResponse.json({
    expenses,
    summary: {
      income: incomeAgg._sum.amount ?? 0,
      expenses: expenseAgg._sum.amount ?? 0,
      net: (incomeAgg._sum.amount ?? 0) - (expenseAgg._sum.amount ?? 0),
    },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_EXPENSES")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense data" }, { status: 400 });
  }

  const exp = await prisma.expenseRecord.create({
    data: {
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      recordedBy: session.userId,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE_EXPENSE",
    entity: "ExpenseRecord",
    entityId: exp.id,
    details: { amount: exp.amount, category: exp.category },
  });

  return NextResponse.json({ expense: exp }, { status: 201 });
}
