/**
 * Paystack Subscriptions for multi-school SaaS billing.
 *
 * Env (Vercel):
 *   PAYSTACK_SECRET_KEY
 *   PAYSTACK_PLAN_STARTER   — plan code from Paystack Dashboard → Plans
 *   PAYSTACK_PLAN_PRO
 *   PAYSTACK_PLAN_ENTERPRISE
 *   NEXT_PUBLIC_APP_URL
 */

import { prisma } from "@/lib/db";

export type SaaSPlan = "STARTER" | "PRO" | "ENTERPRISE";

export const PLAN_LIMITS: Record<SaaSPlan, number> = {
  STARTER: 300,
  PRO: 1500,
  ENTERPRISE: 10000,
};

function planCode(plan: SaaSPlan): string | null {
  const map: Record<SaaSPlan, string | undefined> = {
    STARTER: process.env.PAYSTACK_PLAN_STARTER,
    PRO: process.env.PAYSTACK_PLAN_PRO,
    ENTERPRISE: process.env.PAYSTACK_PLAN_ENTERPRISE,
  };
  return map[plan] || null;
}

export function isSubscriptionLive() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

async function paystackFetch(path: string, init?: RequestInit) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY not set");
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json?.message || `Paystack ${path} failed`);
  }
  return json;
}

export async function ensurePaystackCustomer(schoolId: string, email: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("School not found");

  if (school.paystackCustomerCode) {
    return school.paystackCustomerCode;
  }

  if (!isSubscriptionLive()) {
    const mock = `CUS_mock_${school.slug}`;
    await prisma.school.update({
      where: { id: schoolId },
      data: { paystackCustomerCode: mock, billingEmail: email },
    });
    return mock;
  }

  const json = await paystackFetch("/customer", {
    method: "POST",
    body: JSON.stringify({
      email,
      first_name: school.shortName,
      last_name: school.name.slice(0, 40),
      metadata: { schoolId: school.id, slug: school.slug },
    }),
  });

  const code = json.data.customer_code as string;
  await prisma.school.update({
    where: { id: schoolId },
    data: { paystackCustomerCode: code, billingEmail: email },
  });
  return code;
}

export async function initializeSchoolSubscription(params: {
  schoolId: string;
  plan: SaaSPlan;
  email: string;
}) {
  const { schoolId, plan, email } = params;
  const code = planCode(plan);
  const customer = await ensurePaystackCustomer(schoolId, email);
  const maxStudents = PLAN_LIMITS[plan];

  await prisma.school.update({
    where: { id: schoolId },
    data: {
      plan,
      maxStudents,
      subscriptionStatus: isSubscriptionLive() ? "PENDING" : "ACTIVE_MOCK",
    },
  });

  if (!isSubscriptionLive()) {
    return {
      mock: true as const,
      message:
        "Mock mode: set PAYSTACK_SECRET_KEY and PAYSTACK_PLAN_* codes for live subscriptions. Plan limits applied.",
      schoolId,
      plan,
      maxStudents,
      customer,
    };
  }

  if (!code) {
    throw new Error(
      `Missing Paystack plan code for ${plan}. Set PAYSTACK_PLAN_${plan} in Vercel env.`
    );
  }

  const callback =
    (process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL || "localhost:3000"}`).replace(
      /\/$/,
      ""
    ) + "/platform?billing=ok";

  const json = await paystackFetch("/subscription", {
    method: "POST",
    body: JSON.stringify({
      customer,
      plan: code,
      start_date: new Date().toISOString(),
    }),
  });

  const subCode = json.data?.subscription_code as string | undefined;
  if (subCode) {
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        paystackSubscriptionCode: subCode,
        subscriptionStatus: json.data?.status === "active" ? "ACTIVE" : "PENDING",
      },
    });
  }

  const init = await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: json.data?.amount || 10000,
      plan: code,
      callback_url: callback,
      metadata: { schoolId, plan, type: "saas_subscription" },
    }),
  });

  return {
    mock: false as const,
    authorizationUrl: init.data.authorization_url as string,
    reference: init.data.reference as string,
    subscriptionCode: subCode,
    plan,
    maxStudents,
  };
}

export async function applySubscriptionWebhook(data: {
  customer?: { customer_code?: string; email?: string };
  subscription_code?: string;
  status?: string;
  plan?: { name?: string; plan_code?: string };
  next_payment_date?: string;
  metadata?: { schoolId?: string; plan?: string };
}) {
  const schoolId = data.metadata?.schoolId;
  let school = schoolId
    ? await prisma.school.findUnique({ where: { id: schoolId } })
    : null;

  if (!school && data.subscription_code) {
    school = await prisma.school.findFirst({
      where: { paystackSubscriptionCode: data.subscription_code },
    });
  }
  if (!school && data.customer?.customer_code) {
    school = await prisma.school.findFirst({
      where: { paystackCustomerCode: data.customer.customer_code },
    });
  }
  if (!school) return { ok: false, error: "School not found for subscription event" };

  const status = (data.status || "").toLowerCase();
  let subscriptionStatus = school.subscriptionStatus;
  if (status === "active" || status === "success") subscriptionStatus = "ACTIVE";
  if (status === "non-renewing" || status === "attention") subscriptionStatus = "PAST_DUE";
  if (status === "cancelled" || status === "completed") subscriptionStatus = "CANCELLED";

  const planName = (data.metadata?.plan || data.plan?.name || school.plan).toUpperCase();
  const plan = (["STARTER", "PRO", "ENTERPRISE"].includes(planName)
    ? planName
    : school.plan) as SaaSPlan;

  await prisma.school.update({
    where: { id: school.id },
    data: {
      subscriptionStatus,
      plan,
      maxStudents: PLAN_LIMITS[plan] ?? school.maxStudents,
      paystackSubscriptionCode: data.subscription_code || school.paystackSubscriptionCode,
      planRenewsAt: data.next_payment_date ? new Date(data.next_payment_date) : undefined,
      isActive: subscriptionStatus !== "CANCELLED",
    },
  });

  return { ok: true, schoolId: school.id, subscriptionStatus };
}
