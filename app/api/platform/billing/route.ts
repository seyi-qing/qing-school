import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  initializeSchoolSubscription,
  isSubscriptionLive,
  PLAN_LIMITS,
  type SaaSPlan,
} from "@/lib/integrations/subscriptions";

const SetPlanSchema = z.object({
  action: z.literal("set_plan").optional(),
  schoolId: z.string(),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
});

const SubscribeSchema = z.object({
  action: z.literal("subscribe"),
  schoolId: z.string(),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
  email: z.string().email(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      maxStudents: true,
      isActive: true,
      isDemo: true,
      billingEmail: true,
      subscriptionStatus: true,
      paystackCustomerCode: true,
      paystackSubscriptionCode: true,
      planRenewsAt: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    schools,
    liveBilling: isSubscriptionLive(),
    planLimits: PLAN_LIMITS,
    envHint: {
      PAYSTACK_PLAN_STARTER: Boolean(process.env.PAYSTACK_PLAN_STARTER),
      PAYSTACK_PLAN_PRO: Boolean(process.env.PAYSTACK_PLAN_PRO),
      PAYSTACK_PLAN_ENTERPRISE: Boolean(process.env.PAYSTACK_PLAN_ENTERPRISE),
    },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["PLATFORM_ADMIN", "ADMIN", "IT"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  if (body?.action === "subscribe") {
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid subscribe payload" }, { status: 400 });
    }
    try {
      const result = await initializeSchoolSubscription({
        schoolId: parsed.data.schoolId,
        plan: parsed.data.plan as SaaSPlan,
        email: parsed.data.email,
      });
      await logAudit({
        userId: session.userId,
        action: "SAAS_SUBSCRIBE_INIT",
        entity: "School",
        entityId: parsed.data.schoolId,
        details: { plan: parsed.data.plan, mock: "mock" in result ? result.mock : false },
      });
      return NextResponse.json(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const parsed = SetPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan change" }, { status: 400 });
  }

  const maxStudents = PLAN_LIMITS[parsed.data.plan as SaaSPlan];
  const school = await prisma.school.update({
    where: { id: parsed.data.schoolId },
    data: {
      plan: parsed.data.plan,
      maxStudents,
      subscriptionStatus: "MANUAL",
    },
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
      "Plan limits applied manually. Use action:subscribe for Paystack-hosted subscription payment.",
  });
}
