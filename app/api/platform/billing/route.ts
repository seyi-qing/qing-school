import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const PlanSchema = z.object({
  schoolId: z.string(),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
});

/** Platform billing: set plan limits (Paystack subscription wiring later). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["PLATFORM_ADMIN", "ADMIN", "IT"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan change" }, { status: 400 });
  }

  const maxStudents =
    parsed.data.plan === "STARTER" ? 300 : parsed.data.plan === "PRO" ? 1500 : 10000;

  const school = await prisma.school.update({
    where: { id: parsed.data.schoolId },
    data: { plan: parsed.data.plan, maxStudents },
  });

  await logAudit({
    userId: session.userId,
    action: "SET_SCHOOL_PLAN",
    entity: "School",
    entityId: school.id,
    details: { plan: school.plan, maxStudents },
  });

  return NextResponse.json({
    school,
    billingNote:
      "Plan limits applied. Connect Paystack subscription (plan code per tier) to auto-charge School.id metadata.",
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || !["PLATFORM_ADMIN", "ADMIN", "IT"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, slug: true, plan: true, maxStudents: true, isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ schools });
}
