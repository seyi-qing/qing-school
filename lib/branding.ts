/**
 * Resolve display branding for the current school (white-label).
 * Falls back to KMS defaults in school-config when no School row.
 */
import { prisma } from "@/lib/db";
import { SCHOOL } from "@/lib/school-config";

export type Branding = {
  name: string;
  shortName: string;
  motto: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  phone: string;
  phoneAlt?: string;
  email: string;
  address: string;
};

export function defaultBranding(): Branding {
  return {
    name: SCHOOL.name,
    shortName: SCHOOL.shortName,
    motto: SCHOOL.motto,
    logoUrl: "/logo.svg",
    primaryColor: SCHOOL.colors.primary,
    accentColor: SCHOOL.colors.gold,
    phone: SCHOOL.contact.phone,
    phoneAlt: SCHOOL.contact.phoneAlt,
    email: SCHOOL.contact.email,
    address: SCHOOL.contact.address,
  };
}

export async function getBrandingForSchoolId(schoolId: string | null | undefined): Promise<Branding> {
  if (!schoolId) return defaultBranding();
  const s = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!s) return defaultBranding();
  return {
    name: s.name || SCHOOL.name,
    shortName: s.shortName || SCHOOL.shortName,
    motto: s.motto || SCHOOL.motto,
    logoUrl: s.logoUrl || "/logo.svg",
    primaryColor: s.primaryColor || SCHOOL.colors.primary,
    accentColor: s.accentColor || SCHOOL.colors.gold,
    phone: s.phone || SCHOOL.contact.phone,
    phoneAlt: s.phoneAlt || SCHOOL.contact.phoneAlt,
    email: s.email || SCHOOL.contact.email,
    address: s.address || SCHOOL.contact.address,
  };
}
