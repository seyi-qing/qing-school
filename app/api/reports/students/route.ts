import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { toCsv, csvResponse } from "@/lib/csv";
import { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "VIEW_REPORTS")) {
    return new Response("Forbidden", { status: 403 });
  }

  const schoolId = await resolveSchoolId(session);

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", ...schoolWhere(schoolId) },
    include: { arm: { include: { schoolClass: true } } },
    orderBy: [{ lastName: "asc" }],
  });

  const csv = toCsv(
    ["Admission No.", "Last Name", "First Name", "Gender", "Class", "Arm"],
    students.map((s) => [
      s.admissionNumber,
      s.lastName,
      s.firstName,
      s.gender ?? "",
      s.arm?.schoolClass.name ?? "",
      s.arm?.name ?? "",
    ])
  );

  return csvResponse("student-list.csv", csv);
}
