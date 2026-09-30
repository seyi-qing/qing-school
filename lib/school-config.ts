/**
 * Central school branding & identity.
 * Change values here — they propagate across public site, portals, emails, reports.
 */
export const SCHOOL = {
  name: "Kayvlop Magnificent School",
  shortName: "KMS",
  location: "Matogun",
  motto: "Education with Godliness",
  fullNameWithLocation: "Kayvlop Magnificent School, Matogun",
  tagline: "Excellence in Character, Learning & Godliness",
  emailDomain: "kms.sch.ng",
  admissionPrefix: "KMS", // e.g. KMS/2026/0001
  staffIdPrefix: "KMS-STF",
  sessionCookie: "kms_session",
  smsSender: "KMS",
  paymentRefPrefix: "KMS",
  colors: {
    primary: "#1a3a6e", // deep blue from logo ring
    primaryDark: "#0f2748",
    accent: "#c41e3a", // red from ribbon
    gold: "#c9a227",
    paper: "#f7f5ef",
    ink: "#1c2230",
  },
  contact: {
    phone: "+234 800 000 0000",
    email: "info@kms.sch.ng",
    address: "Matogun, Ogun State, Nigeria",
  },
  social: {
    // fill when available
  },
} as const;

export type SchoolConfig = typeof SCHOOL;
