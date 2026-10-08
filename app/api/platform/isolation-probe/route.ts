import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * PLATFORM_ADMIN only — reports per-school student/invoice counts.
 * Use to verify multi-tenant data is partitioned after onboarding a second school.
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden — platform admin only" }, { status: 403 });
  }

  const schools = await prisma.school.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      subscriptionStatus: true,
      _count: {
        select: {
          students: true,
          staff: true,
          classes: true,
        },
      },
    },
  });

  const withInvoices = await Promise.all(
    schools.map(async (s) => {
      const invoices = await prisma.invoice.count({
        where: { student: { schoolId: s.id } },
      });
      const payments = await prisma.payment.count({
        where: { student: { schoolId: s.id } },
      });
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        isActive: s.isActive,
        subscriptionStatus: s.subscriptionStatus,
        students: s._count.students,
        staff: s._count.staff,
        classes: s._count.classes,
        invoices,
        payments,
      };
    })
  );

  const ok = withInvoices.length >= 1;

  return NextResponse.json({
    ok,
    schoolCount: withInvoices.length,
    schools: withInvoices,
    hint:
      withInvoices.length < 2
        ? "Onboard a second school via /onboarding, then re-run this probe."
        : "Compare counts: each school should only reflect its own data. Log in as each school admin to confirm UI lists match.",
  });
}
