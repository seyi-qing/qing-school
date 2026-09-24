import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "VIEW_REPORTS")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? 30);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const attendances = await prisma.attendance.findMany({
    where: { date: { gte: since } },
    include: { student: true },
    orderBy: { date: "desc" },
  });

  const csv = toCsv(
    ["Date", "Admission No.", "Name", "Status"],
    attendances.map((a) => [
      a.date.toISOString().slice(0, 10),
      a.student.admissionNumber,
      `${a.student.lastName}, ${a.student.firstName}`,
      a.status,
    ])
  );

  return csvResponse("attendance-sheet.csv", csv);
}
