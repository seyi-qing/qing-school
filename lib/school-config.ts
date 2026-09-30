/**
 * Central school branding & identity.
 * Change values here — they propagate across public site, portals, emails, reports.
 */
export const SCHOOL = {
  name: "Kayvlop Magnificent School",
  shortName: "KMS",
  location: "Matogun",
  motto: "Education with Godliness",
  /** Display name for headers — short form */
  headerName: "KMS",
  tagline: "Excellence in Character, Learning & Godliness",
  emailDomain: "gmail.com",
  admissionPrefix: "KMS",
  staffIdPrefix: "KMS-STF",
  sessionCookie: "kms_session",
  smsSender: "KMS",
  paymentRefPrefix: "KMS",
  colors: {
    primary: "#1a3a6e",
    primaryDark: "#0f2748",
    accent: "#c41e3a",
    gold: "#c9a227",
    paper: "#f7f5ef",
    ink: "#1c2230",
  },
  contact: {
    phone: "07032185227",
    phoneAlt: "08137497720",
    phoneAlt2: "08056570347",
    email: "kayvlopmagnificentschool@gmail.com",
    address: "3, Olambe, Olamide Oladele Close, Matogun",
  },
} as const;

export type SchoolConfig = typeof SCHOOL;
