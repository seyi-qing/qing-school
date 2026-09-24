import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const CreateStaffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  category: z.enum(["TEACHING", "NON_TEACHING"]),
  designation: z.string().optional(),
  qualification: z.string().optional(),
  phone: z.string().optional(),
  monthlySalary: z.coerce.number().nonnegative().optional(),
  role: z.enum(["TEACHER", "ACCOUNTANT", "SECRETARY", "IT", "PRINCIPAL", "ADMIN"]),
});

async function generateStaffId(): Promise<string> {
  const count = await prisma.staff.count();
  return `FS-STF-${String(count + 1).padStart(4, "0")}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staff = await prisma.staff.findMany({
    include: { user: { select: { email: true, role: true, isActive: true } } },
    orderBy: [{ lastName: "asc" }],
  });
  return NextResponse.json({ staff });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_STAFF")) {
    return NextResponse.json({ error: "You don't have permission to add staff." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const data = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const defaultPassword = "Welcome123!";
  const passwordHash = await hashPassword(defaultPassword);
  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, role: data.role },
  });

  const staff = await prisma.staff.create({
    data: {
      staffId: await generateStaffId(),
      userId: user.id,
      firstName: data.firstName,
      lastName: data.lastName,
      category: data.category,
      designation: data.designation,
      qualification: data.qualification,
      phone: data.phone,
      monthlySalary: data.monthlySalary,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE_STAFF",
    entity: "Staff",
    entityId: staff.id,
    details: { email: data.email, role: data.role },
  });

  return NextResponse.json({ staff, defaultPassword }, { status: 201 });
}
