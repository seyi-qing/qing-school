import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const RunPayrollSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  deductionPercent: z.coerce.number().min(0).max(100).default(0),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_PAYROLL")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RunPayrollSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { month, deductionPercent } = parsed.data;

  const staffList = await prisma.staff.findMany({
    where: { isActive: true, monthlySalary: { not: null } },
  });

  let generated = 0;
  for (const staff of staffList) {
    const gross = staff.monthlySalary ?? 0;
    const deductions = Math.round(gross * (deductionPercent / 100));
    const net = gross - deductions;

    const already = await prisma.payslip.findUnique({
      where: { staffId_month: { staffId: staff.id, month } },
    });
    if (already) continue;

    await prisma.payslip.create({ data: { staffId: staff.id, month, gross, deductions, net } });
    generated++;
  }

  await logAudit({
    userId: session.userId,
    action: "RUN_PAYROLL",
    entity: "Payslip",
    details: { month, generated },
  });

  return NextResponse.json({ generated });
}
