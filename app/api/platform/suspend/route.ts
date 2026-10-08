import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  schoolId: z.string().min(1),
  action: z.enum(["suspend", "activate"]),
  reason: z.string().max(200).optional(),
});

/** Platform admin: soft-suspend a school (non-pay / abuse). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { schoolId, action, reason } = parsed.data;
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data:
      action === "suspend"
        ? { isActive: false, subscriptionStatus: "SUSPENDED" }
        : { isActive: true, subscriptionStatus: school.subscriptionStatus === "SUSPENDED" ? "ACTIVE" : school.subscriptionStatus },
  });

  await logAudit({
    userId: session.userId,
    action: action === "suspend" ? "SUSPEND_SCHOOL" : "ACTIVATE_SCHOOL",
    entity: "School",
    entityId: schoolId,
    details: { reason, slug: school.slug },
  });

  return NextResponse.json({
    ok: true,
    school: {
      id: updated.id,
      slug: updated.slug,
      isActive: updated.isActive,
      subscriptionStatus: updated.subscriptionStatus,
    },
  });
}
