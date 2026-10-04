import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_STUDENTS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "ACTIVE";

  const students = await prisma.student.findMany({
    where: { status },
    include: { arm: { include: { schoolClass: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 2000,
  });

  const header = [
    "Admission Number",
    "First Name",
    "Last Name",
    "Other Names",
    "Gender",
    "Status",
    "Class",
    "Arm",
    "Guardian Phone",
    "Address",
  ];
  const rows = students.map((s) =>
    [
      s.admissionNumber,
      s.firstName,
      s.lastName,
      s.otherNames ?? "",
      s.gender ?? "",
      s.status,
      s.arm?.schoolClass.name ?? "",
      s.arm?.name ?? "",
      s.guardianPhone ?? "",
      (s.address ?? "").replace(/"/g, '""'),
    ]
      .map((c) => `"${String(c)}"`)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kms-students-${status.toLowerCase()}.csv"`,
    },
  });
}
