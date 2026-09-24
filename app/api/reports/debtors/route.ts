import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "VIEW_REPORTS")) {
    return new Response("Forbidden", { status: 403 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] } },
    include: { student: { include: { arm: { include: { schoolClass: true } } } } },
  });

  const csv = toCsv(
    ["Admission No.", "Name", "Class", "Total Due", "Amount Paid", "Balance"],
    invoices.map((inv) => [
      inv.student.admissionNumber,
      `${inv.student.lastName}, ${inv.student.firstName}`,
      inv.student.arm ? `${inv.student.arm.schoolClass.name} ${inv.student.arm.name}` : "",
      inv.totalAmount,
      inv.amountPaid,
      inv.totalAmount - inv.amountPaid,
    ])
  );

  return csvResponse("fee-defaulters.csv", csv);
}
