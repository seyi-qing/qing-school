import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";
import { DEFAULT_GRADE_BANDS } from "../lib/grading";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Password123!";

async function upsertUser(email: string, role: any) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role },
  });
}

async function main() {
  console.log("Seeding database...");

  const existingBands = await prisma.gradeBand.count();
  if (existingBands === 0) {
    await prisma.gradeBand.createMany({ data: DEFAULT_GRADE_BANDS });
  }

  const session = await prisma.session.upsert({
    where: { name: "2025/2026" },
    update: {},
    create: { name: "2025/2026", isCurrent: true },
  });

  let term = await prisma.term.findFirst({ where: { sessionId: session.id, name: "First Term" } });
  if (!term) {
    term = await prisma.term.create({
      data: { sessionId: session.id, name: "First Term", isCurrent: true },
    });
  }

  await upsertUser("admin@forceschools.test", "ADMIN");
  await upsertUser("it@forceschools.test", "IT");
  await upsertUser("secretary@forceschools.test", "SECRETARY");
  await upsertUser("principal@forceschools.test", "PRINCIPAL");
  await upsertUser("accountant@forceschools.test", "ACCOUNTANT");
  const teacherUser = await upsertUser("teacher@forceschools.test", "TEACHER");
  const studentUser = await upsertUser("student@forceschools.test", "STUDENT");
  const parentUser = await upsertUser("parent@forceschools.test", "PARENT");

  const jss1 = await prisma.schoolClass.upsert({
    where: { id: "seed-jss1" },
    update: {},
    create: { id: "seed-jss1", name: "JSS 1", order: 1 },
  }).catch(async () => {
    const existing = await prisma.schoolClass.findFirst({ where: { name: "JSS 1" } });
    if (existing) return existing;
    return prisma.schoolClass.create({ data: { name: "JSS 1", order: 1 } });
  });

  let jss1Gold = await prisma.arm.findFirst({ where: { schoolClassId: jss1.id, name: "Gold" } });
  if (!jss1Gold) {
    jss1Gold = await prisma.arm.create({ data: { name: "Gold", schoolClassId: jss1.id } });
  }

  const math = await prisma.subject.upsert({
    where: { name: "Mathematics" },
    update: {},
    create: { name: "Mathematics", code: "MATH" },
  });
  const eng = await prisma.subject.upsert({
    where: { name: "English" },
    update: {},
    create: { name: "English", code: "ENG" },
  });

  await prisma.armSubject.upsert({
    where: { armId_subjectId: { armId: jss1Gold.id, subjectId: math.id } },
    update: {},
    create: { armId: jss1Gold.id, subjectId: math.id },
  });
  await prisma.armSubject.upsert({
    where: { armId_subjectId: { armId: jss1Gold.id, subjectId: eng.id } },
    update: {},
    create: { armId: jss1Gold.id, subjectId: eng.id },
  });

  const teacher = await prisma.staff.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      staffId: "FS-STF-0001",
      userId: teacherUser.id,
      firstName: "Ada",
      lastName: "Okonkwo",
      category: "TEACHING",
      designation: "Class Teacher",
      monthlySalary: 120000,
    },
  });

  let demoStudent = await prisma.student.findFirst({ where: { admissionNumber: "FS/2025/0001" } });
  if (!demoStudent) {
    demoStudent = await prisma.student.create({
      data: {
        admissionNumber: "FS/2025/0001",
        firstName: "Chinedu",
        lastName: "Okafor",
        gender: "Male",
        armId: jss1Gold.id,
        status: "ACTIVE",
        userId: studentUser.id,
      },
    });
  }

  await prisma.parentLink.upsert({
    where: { parentId_studentId: { parentId: parentUser.id, studentId: demoStudent.id } },
    update: {},
    create: { parentId: parentUser.id, studentId: demoStudent.id, relation: "Father" },
  });

  const existingFee = await prisma.feeItem.findFirst({ where: { armId: jss1Gold.id, termId: term.id, name: "Tuition" } });
  if (!existingFee) {
    await prisma.feeItem.create({ data: { armId: jss1Gold.id, termId: term.id, name: "Tuition", amount: 85000, compulsory: true } });
    await prisma.feeItem.create({ data: { armId: jss1Gold.id, termId: term.id, name: "Books & Materials", amount: 12000, compulsory: true } });
  }

  const existingInv = await prisma.invoice.findFirst({ where: { studentId: demoStudent.id, termId: term.id } });
  if (!existingInv) {
    await prisma.invoice.create({
      data: {
        studentId: demoStudent.id,
        termId: term.id,
        lineItems: JSON.stringify([{ name: "Tuition", amount: 85000 }, { name: "Books & Materials", amount: 12000 }]),
        totalAmount: 97000,
        amountPaid: 40000,
        status: "PARTIAL",
      },
    });
  }

  await prisma.resultPin.upsert({
    where: { code: "184-773-902" },
    update: {},
    create: { code: "184-773-902", termId: term.id },
  });

  const existingNotice = await prisma.notice.findFirst({ where: { title: "Resumption Date for Second Term" } });
  if (!existingNotice) {
    await prisma.notice.create({
      data: {
        title: "Resumption Date for Second Term",
        body: "All students are to resume on the 12th of January. School fees for the term are due before resumption.",
        audience: "ALL",
        publishToWeb: true,
      },
    });
  }

  console.log("\nSeed complete. Demo password for all accounts:", DEMO_PASSWORD);
  console.log("Result Checker: admission FS/2025/0001, PIN 184-773-902\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
