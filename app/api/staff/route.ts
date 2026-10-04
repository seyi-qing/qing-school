import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { validatePassword, passwordPolicyHint } from "@/lib/password-policy";

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

const UpdateStaffSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  category: z.enum(["TEACHING", "NON_TEACHING"]).optional(),
  designation: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  monthlySalary: z.coerce.number().nonnegative().optional().nullable(),
  role: z.enum(["TEACHER", "ACCOUNTANT", "SECRETARY", "IT", "PRINCIPAL", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

async function generateStaffId(): Promise<string> {
  const count = await prisma.staff.count();
  return `KMS-STF-${String(count + 1).padStart(4, "0")}`;
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

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_STAFF")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  if (body?.action === "resetPassword" && body?.staffId) {
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const check = validatePassword(newPassword);
    if (!check.ok) {
      return NextResponse.json({ error: check.message, hint: passwordPolicyHint() }, { status: 400 });
    }
    const staff = await prisma.staff.findUnique({ where: { id: body.staffId } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: staff.userId },
      data: { passwordHash },
    });
    await logAudit({
      userId: session.userId,
      action: "RESET_STAFF_PASSWORD",
      entity: "Staff",
      entityId: staff.id,
    });
    return NextResponse.json({ ok: true, message: "Password reset." });
  }

  const parsed = UpdateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const staff = await prisma.staff.findUnique({ where: { id: parsed.data.id } });
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const data = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.staff.update({
      where: { id: staff.id },
      data: {
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        category: data.category ?? undefined,
        designation: data.designation === undefined ? undefined : data.designation,
        qualification: data.qualification === undefined ? undefined : data.qualification,
        phone: data.phone === undefined ? undefined : data.phone,
        monthlySalary: data.monthlySalary === undefined ? undefined : data.monthlySalary,
        isActive: data.isActive ?? undefined,
      },
    });
    if (data.role !== undefined || data.isActive !== undefined) {
      await tx.user.update({
        where: { id: staff.userId },
        data: {
          role: data.role ?? undefined,
          isActive: data.isActive ?? undefined,
        },
      });
    }
    return s;
  });

  await logAudit({
    userId: session.userId,
    action: "UPDATE_STAFF",
    entity: "Staff",
    entityId: updated.id,
    details: { role: data.role, isActive: data.isActive },
  });

  return NextResponse.json({ staff: updated });
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

  const defaultPassword = "Kms@" + Math.random().toString(36).slice(2, 8) + "A1!";
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
