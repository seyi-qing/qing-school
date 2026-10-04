import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";
import { DEFAULT_GRADE_BANDS } from "../lib/grading";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Password123!";

/** Prefer KMS emails; migrate legacy @kms.legacy.test if present. */
async function upsertUser(email: string, role: any, legacyEmail?: string) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  if (legacyEmail) {
    const legacy = await prisma.user.findUnique({ where: { email: legacyEmail } });
    if (legacy) {
      const taken = await prisma.user.findUnique({ where: { email } });
      if (!taken || taken.id === legacy.id) {
        return prisma.user.update({
          where: { id: legacy.id },
          data: { email, passwordHash, role, isActive: true },
        });
      }
    }
  }

  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, isActive: true },
    create: { email, passwordHash, role },
  });
}

async function main() {
  console.log("Seeding Kayvlop Magnificent School (KMS)...");

  const existingBands = await prisma.gradeBand.count();
  if (existingBands === 0) {
    await prisma.gradeBand.createMany({ data: DEFAULT_GRADE_BANDS });
  }

  const school = await prisma.school.upsert({
    where: { slug: "kms" },
    update: { name: "Kayvlop Magnificent School", shortName: "KMS", isDemo: false },
    create: {
      slug: "kms",
      name: "Kayvlop Magnificent School",
      shortName: "KMS",
      motto: "Education with Godliness",
      tagline: "Excellence in Character, Learning & Godliness",
      primaryColor: "#1a3a6e",
      accentColor: "#c9a227",
      phone: "07032185227",
      email: "kayvlopmagnificentschool@gmail.com",
      address: "3, Olambe, Olamide Oladele Close, Matogun",
      location: "Matogun",
      plan: "PRO",
      isActive: true,
      isDemo: false,
      maxStudents: 2000,
    },
  });
  const schoolId = school.id;

  let session = await prisma.session.findFirst({ where: { name: "2025/2026", schoolId } });
  if (!session) {
    session = await prisma.session.create({
      data: { name: "2025/2026", isCurrent: true, schoolId },
    });
  }

  let term = await prisma.term.findFirst({ where: { sessionId: session.id, name: "First Term" } });
  if (!term) {
    term = await prisma.term.create({
      data: { sessionId: session.id, name: "First Term", isCurrent: true },
    });
  }

  await upsertUser("admin@kms.sch.ng", "ADMIN", "admin@kms.legacy.test");
  await upsertUser("it@kms.sch.ng", "IT", "it@kms.legacy.test");
  await upsertUser("secretary@kms.sch.ng", "SECRETARY", "secretary@kms.legacy.test");
  await upsertUser("principal@kms.sch.ng", "PRINCIPAL", "principal@kms.legacy.test");
  await upsertUser("accountant@kms.sch.ng", "ACCOUNTANT", "accountant@kms.legacy.test");
  const teacherUser = await upsertUser("teacher@kms.sch.ng", "TEACHER", "teacher@kms.legacy.test");
  const studentUser = await upsertUser("student@kms.sch.ng", "STUDENT", "student@kms.legacy.test");
  const parentUser = await upsertUser("parent@kms.sch.ng", "PARENT", "parent@kms.legacy.test");

  const jss1 = await prisma.schoolClass
    .upsert({
      where: { id: "seed-jss1" },
      update: { schoolId },
      create: { id: "seed-jss1", name: "JSS 1", order: 1, schoolId },
    })
    .catch(async () => {
      const existing = await prisma.schoolClass.findFirst({ where: { name: "JSS 1" } });
      if (existing) {
        return prisma.schoolClass.update({ where: { id: existing.id }, data: { schoolId } });
      }
      return prisma.schoolClass.create({ data: { name: "JSS 1", order: 1, schoolId } });
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
    update: { schoolId },
    create: {
      staffId: "KMS-STF-0001",
      userId: teacherUser.id,
      firstName: "Ada",
      lastName: "Okonkwo",
      category: "TEACHING",
      designation: "Class Teacher",
      monthlySalary: 120000,
      schoolId,
    },
  });

  let demoStudent = await prisma.student.findFirst({
    where: {
      OR: [
        { admissionNumber: "KMS/2025/0001" },
        { admissionNumber: "FS/2025/0001" },
        { userId: studentUser.id },
      ],
    },
  });
  if (!demoStudent) {
    demoStudent = await prisma.student.create({
      data: {
        admissionNumber: "KMS/2025/0001",
        firstName: "Chinedu",
        lastName: "Okafor",
        gender: "Male",
        armId: jss1Gold.id,
        status: "ACTIVE",
        userId: studentUser.id,
        schoolId,
      },
    });
  } else {
    demoStudent = await prisma.student.update({
      where: { id: demoStudent.id },
      data: {
        admissionNumber: "KMS/2025/0001",
        userId: studentUser.id,
        status: "ACTIVE",
        armId: jss1Gold.id,
        schoolId,
      },
    });
  }

  await prisma.parentLink.upsert({
    where: { parentId_studentId: { parentId: parentUser.id, studentId: demoStudent.id } },
    update: {},
    create: { parentId: parentUser.id, studentId: demoStudent.id, relation: "Father" },
  });

  const existingFee = await prisma.feeItem.findFirst({
    where: { armId: jss1Gold.id, termId: term.id, name: "Tuition" },
  });
  if (!existingFee) {
    await prisma.feeItem.create({
      data: { armId: jss1Gold.id, termId: term.id, name: "Tuition", amount: 85000, compulsory: true },
    });
    await prisma.feeItem.create({
      data: {
        armId: jss1Gold.id,
        termId: term.id,
        name: "Books & Materials",
        amount: 12000,
        compulsory: true,
      },
    });
  }

  const existingInv = await prisma.invoice.findFirst({
    where: { studentId: demoStudent.id, termId: term.id },
  });
  if (!existingInv) {
    await prisma.invoice.create({
      data: {
        studentId: demoStudent.id,
        termId: term.id,
        lineItems: JSON.stringify([
          { name: "Tuition", amount: 85000 },
          { name: "Books & Materials", amount: 12000 },
        ]),
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

  const noticeCount = await prisma.notice.count();
  if (noticeCount === 0) {
    await prisma.notice.create({
      data: {
        title: "Welcome to Kayvlop Magnificent School",
        body: "Portal is live. Use demo accounts to explore each role. Motto: Education with Godliness.",
        audience: "ALL",
        publishToWeb: true,
        schoolId,
      },
    });
  }

  await prisma.user.updateMany({ where: { schoolId: null, role: { not: "PLATFORM_ADMIN" } }, data: { schoolId } });
  await prisma.student.updateMany({ where: { schoolId: null }, data: { schoolId } });
  await prisma.staff.updateMany({ where: { schoolId: null }, data: { schoolId } });
  await prisma.schoolClass.updateMany({ where: { schoolId: null }, data: { schoolId } });

  console.log("\nSeed complete.");
  console.log("Demo password for all accounts:", DEMO_PASSWORD);
  console.log("Admin:       admin@kms.sch.ng");
  console.log("Teacher:     teacher@kms.sch.ng");
  console.log("Student:     student@kms.sch.ng");
  console.log("Parent:      parent@kms.sch.ng");
  console.log("Result PIN:  184-773-902  |  Admission: KMS/2025/0001");
  void teacher;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
