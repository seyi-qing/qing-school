import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEMO_PASSWORD = "Password123!";

const ACCOUNTS: Array<{
  email: string;
  role: "ADMIN" | "IT" | "SECRETARY" | "PRINCIPAL" | "ACCOUNTANT" | "TEACHER" | "STUDENT" | "PARENT";
}> = [
  { email: "admin@forceschools.test", role: "ADMIN" },
  { email: "it@forceschools.test", role: "IT" },
  { email: "secretary@forceschools.test", role: "SECRETARY" },
  { email: "principal@forceschools.test", role: "PRINCIPAL" },
  { email: "accountant@forceschools.test", role: "ACCOUNTANT" },
  { email: "teacher@forceschools.test", role: "TEACHER" },
  { email: "student@forceschools.test", role: "STUDENT" },
  { email: "parent@forceschools.test", role: "PARENT" },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.SETUP_SECRET;

  if (!expected || expected.length < 8) {
    return NextResponse.json(
      { ok: false, error: "SETUP_SECRET is not set on the server." },
      { status: 503 }
    );
  }
  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }

  try {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const users: Record<string, { id: string; email: string; role: string }> = {};

    for (const acc of ACCOUNTS) {
      const u = await prisma.user.upsert({
        where: { email: acc.email },
        update: { passwordHash, role: acc.role, isActive: true },
        create: { email: acc.email, passwordHash, role: acc.role },
      });
      users[acc.role] = u;
    }

    const session = await prisma.session.upsert({
      where: { name: "2025/2026" },
      update: { isCurrent: true },
      create: { name: "2025/2026", isCurrent: true },
    });

    let term = await prisma.term.findFirst({
      where: { sessionId: session.id, name: "First Term" },
    });
    if (!term) {
      term = await prisma.term.create({
        data: { sessionId: session.id, name: "First Term", isCurrent: true },
      });
    }

    // Class structure
    let schoolClass = await prisma.schoolClass.findFirst({ where: { name: "JSS 1" } });
    if (!schoolClass) {
      schoolClass = await prisma.schoolClass.create({ data: { name: "JSS 1", order: 1 } });
    }
    let arm = await prisma.arm.findFirst({
      where: { schoolClassId: schoolClass.id, name: "A" },
    });
    if (!arm) {
      arm = await prisma.arm.create({
        data: { schoolClassId: schoolClass.id, name: "A" },
      });
    }

    // Teacher staff profile
    const teacherUser = users.TEACHER;
    let teacherStaff = await prisma.staff.findUnique({ where: { userId: teacherUser.id } });
    if (!teacherStaff) {
      teacherStaff = await prisma.staff.create({
        data: {
          staffId: "FS-STF-0001",
          userId: teacherUser.id,
          firstName: "Ade",
          lastName: "Bello",
          category: "TEACHING",
          designation: "Class Teacher",
          monthlySalary: 180000,
        },
      });
    }

    // Demo student linked to student login
    const studentUser = users.STUDENT;
    let student = await prisma.student.findFirst({
      where: { OR: [{ userId: studentUser.id }, { admissionNumber: "FS/2025/0001" }] },
    });
    if (!student) {
      student = await prisma.student.create({
        data: {
          admissionNumber: "FS/2025/0001",
          userId: studentUser.id,
          firstName: "Chioma",
          lastName: "Okafor",
          gender: "Female",
          status: "ACTIVE",
          armId: arm.id,
          medicalNotes: "Phone: 08030000001 | Demo student",
        },
      });
    } else if (!student.userId) {
      student = await prisma.student.update({
        where: { id: student.id },
        data: { userId: studentUser.id, status: "ACTIVE", armId: arm.id },
      });
    }

    // Parent link
    const parentUser = users.PARENT;
    const existingLink = await prisma.parentLink.findFirst({
      where: { parentId: parentUser.id, studentId: student.id },
    });
    if (!existingLink) {
      await prisma.parentLink.create({
        data: {
          parentId: parentUser.id,
          studentId: student.id,
          relation: "Mother",
        },
      });
    }

    // Optional subject + invoice so portals are not empty
    let math = await prisma.subject.findFirst({ where: { name: "Mathematics" } });
    if (!math) {
      math = await prisma.subject.create({ data: { name: "Mathematics", code: "MTH" } });
    }
    let armSubject = await prisma.armSubject.findFirst({
      where: { armId: arm.id, subjectId: math.id },
    });
    if (!armSubject) {
      armSubject = await prisma.armSubject.create({
        data: { armId: arm.id, subjectId: math.id, teacherId: teacherStaff.id },
      });
    }

    const invCount = await prisma.invoice.count({ where: { studentId: student.id } });
    if (invCount === 0) {
      await prisma.invoice.create({
        data: {
          studentId: student.id,
          termId: term.id,
          lineItems: JSON.stringify([{ name: "Tuition", amount: 50000 }]),
          totalAmount: 50000,
          amountPaid: 0,
          status: "UNPAID",
        },
      });
    }

    const noticeCount = await prisma.notice.count();
    if (noticeCount === 0) {
      await prisma.notice.create({
        data: {
          title: "Welcome to Force Schools",
          body: "Portal is live. Use demo accounts to explore each role.",
          audience: "ALL",
          publishToWeb: true,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Full seed complete — users, class, linked student/parent/teacher, sample invoice",
      password: DEMO_PASSWORD,
      accounts: ACCOUNTS.map((a) => `${a.role}: ${a.email}`),
      studentAdmission: student.admissionNumber,
      linked: {
        studentUserId: studentUser.id,
        studentId: student.id,
        teacherStaffId: teacherStaff.id,
        parentUserId: parentUser.id,
      },
      loginUrl: "/login",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
