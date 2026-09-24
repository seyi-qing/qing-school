import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const CreateClassSchema = z.object({ name: z.string().min(1), order: z.coerce.number().default(0) });
const CreateArmSchema = z.object({ schoolClassId: z.string(), name: z.string().min(1) });

export async function GET() {
  const classes = await prisma.schoolClass.findMany({
    include: { arms: { include: { students: { select: { id: true } } } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ classes });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_CLASSES")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  if (body?.schoolClassId) {
    const parsed = CreateArmSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid arm data." }, { status: 400 });
    const arm = await prisma.arm.create({ data: parsed.data });
    await logAudit({ userId: session.userId, action: "CREATE_ARM", entity: "Arm", entityId: arm.id });
    return NextResponse.json({ arm }, { status: 201 });
  }

  const parsed = CreateClassSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid class data." }, { status: 400 });
  const schoolClass = await prisma.schoolClass.create({ data: parsed.data });
  await logAudit({ userId: session.userId, action: "CREATE_CLASS", entity: "SchoolClass", entityId: schoolClass.id });
  return NextResponse.json({ schoolClass }, { status: 201 });
}
