/**
 * Multi-tenant resolution.
 */
import { prisma } from "@/lib/db";
import { SCHOOL as FALLBACK } from "@/lib/school-config";

export type TenantSchool = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  motto: string | null;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  phone: string | null;
  phoneAlt: string | null;
  email: string | null;
  address: string | null;
  location: string | null;
  plan: string;
  isActive: boolean;
  isDemo: boolean;
  maxStudents: number;
};

export function schoolToBranding(s: TenantSchool) {
  return {
    name: s.name,
    shortName: s.shortName,
    location: s.location || "",
    motto: s.motto || FALLBACK.motto,
    headerName: s.shortName,
    tagline: s.tagline || FALLBACK.tagline,
    logoUrl: s.logoUrl,
    colors: {
      primary: s.primaryColor,
      primaryDark: s.primaryColor,
      accent: s.accentColor,
      gold: s.accentColor,
      paper: FALLBACK.colors.paper,
      ink: FALLBACK.colors.ink,
    },
    contact: {
      phone: s.phone || FALLBACK.contact.phone,
      phoneAlt: s.phoneAlt || FALLBACK.contact.phoneAlt,
      phoneAlt2: FALLBACK.contact.phoneAlt2,
      email: s.email || FALLBACK.contact.email,
      address: s.address || FALLBACK.contact.address,
    },
    plan: s.plan,
    isDemo: s.isDemo,
    slug: s.slug,
    id: s.id,
  };
}

export async function ensureDefaultSchool(): Promise<TenantSchool> {
  const existing = await prisma.school.findUnique({ where: { slug: "kms" } });
  if (existing) return existing;
  return prisma.school.create({
    data: {
      slug: "kms",
      name: FALLBACK.name,
      shortName: FALLBACK.shortName,
      motto: FALLBACK.motto,
      tagline: FALLBACK.tagline,
      primaryColor: FALLBACK.colors.primary,
      accentColor: FALLBACK.colors.gold,
      phone: FALLBACK.contact.phone,
      phoneAlt: FALLBACK.contact.phoneAlt,
      email: FALLBACK.contact.email,
      address: FALLBACK.contact.address,
      location: FALLBACK.location,
      plan: "PRO",
      isActive: true,
      isDemo: false,
      maxStudents: 2000,
    },
  });
}

export async function getSchoolBySlug(slug: string) {
  return prisma.school.findFirst({ where: { slug, isActive: true } });
}

export async function getSchoolById(id: string) {
  return prisma.school.findFirst({ where: { id, isActive: true } });
}

export async function resolveSchool(opts?: {
  slug?: string | null;
  host?: string | null;
  schoolId?: string | null;
}): Promise<TenantSchool> {
  if (opts?.schoolId) {
    const byId = await getSchoolById(opts.schoolId);
    if (byId) return byId;
  }
  if (opts?.slug) {
    const bySlug = await getSchoolBySlug(opts.slug);
    if (bySlug) return bySlug;
  }
  if (opts?.host) {
    const host = opts.host.split(":")[0];
    const parts = host.split(".");
    if (parts.length >= 3 && parts[0] !== "www" && parts[0] !== "app") {
      const bySub = await getSchoolBySlug(parts[0]);
      if (bySub) return bySub;
    }
  }
  return ensureDefaultSchool();
}

export async function backfillSchoolIds(schoolId: string) {
  await Promise.all([
    prisma.user.updateMany({ where: { schoolId: null, role: { not: "PLATFORM_ADMIN" } }, data: { schoolId } }),
    prisma.student.updateMany({ where: { schoolId: null }, data: { schoolId } }),
    prisma.staff.updateMany({ where: { schoolId: null }, data: { schoolId } }),
    prisma.schoolClass.updateMany({ where: { schoolId: null }, data: { schoolId } }),
    prisma.notice.updateMany({ where: { schoolId: null }, data: { schoolId } }),
    prisma.cmsPage.updateMany({ where: { schoolId: null }, data: { schoolId } }),
    prisma.session.updateMany({ where: { schoolId: null }, data: { schoolId } }),
    prisma.auditLog.updateMany({ where: { schoolId: null }, data: { schoolId } }),
  ]);
}
