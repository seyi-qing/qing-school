import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const GenerateInvoicesSchema = z.object({
  armId: z.string(),
  termId: z.string(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_FEES")) {
    return NextResponse.json({ error: "You don't have permission to generate invoices." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = GenerateInvoicesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { armId, termId } = parsed.data;

  const [feeItems, students] = await Promise.all([
    prisma.feeItem.findMany({ where: { armId, termId, compulsory: true } }),
    prisma.student.findMany({ where: { armId, status: "ACTIVE" } }),
  ]);

  if (feeItems.length === 0) {
    return NextResponse.json(
      { error: "No compulsory fee items are set up for this class/term yet." },
      { status: 400 }
    );
  }

  const total = feeItems.reduce((sum, f) => sum + f.amount, 0);
  const lineItems = feeItems.map((f) => ({ name: f.name, amount: f.amount }));

  let created = 0;
  for (const student of students) {
    const already = await prisma.invoice.findFirst({ where: { studentId: student.id, termId } });
    if (already) continue;
    await prisma.invoice.create({
      data: {
        studentId: student.id,
        termId,
        lineItems: JSON.stringify(lineItems),
        totalAmount: total,
      },
    });
    created++;
  }

  await logAudit({
    userId: session.userId,
    action: "GENERATE_INVOICES",
    entity: "Invoice",
    details: { armId, termId, created },
  });

  return NextResponse.json({ created });
}
