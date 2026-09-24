import type { Role } from "@prisma/client";

export const PERMISSIONS = {
  VIEW_DASHBOARD_FINANCIALS: ["ADMIN", "PRINCIPAL", "ACCOUNTANT"],
  MANAGE_STUDENTS: ["ADMIN", "IT", "SECRETARY"],
  MANAGE_STAFF: ["ADMIN", "IT"],
  MANAGE_PAYROLL: ["ADMIN", "ACCOUNTANT"],
  MANAGE_CLASSES: ["ADMIN", "IT"],
  MANAGE_FEES: ["ADMIN", "ACCOUNTANT"],
  RECORD_PAYMENT: ["ADMIN", "ACCOUNTANT", "SECRETARY"],
  MANAGE_EXPENSES: ["ADMIN", "ACCOUNTANT"],
  TAKE_ATTENDANCE: ["ADMIN", "TEACHER"],
  ENTER_SCORES: ["ADMIN", "TEACHER"],
  VIEW_ALL_RESULTS: ["ADMIN", "PRINCIPAL", "TEACHER"],
  MANAGE_NOTICES: ["ADMIN", "IT", "SECRETARY", "PRINCIPAL"],
  MANAGE_SYSTEM_SETTINGS: ["ADMIN", "IT"],
  VIEW_AUDIT_TRAIL: ["ADMIN", "IT"],
  MANAGE_USERS: ["ADMIN", "IT"],
  VIEW_REPORTS: ["ADMIN", "IT", "PRINCIPAL", "ACCOUNTANT", "SECRETARY"],
  SEND_FEE_REMINDERS: ["ADMIN", "ACCOUNTANT", "SECRETARY"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function homeRouteForRole(role: Role): string {
  switch (role) {
    case "STUDENT":
      return "/portal/student";
    case "PARENT":
      return "/portal/parent";
    case "TEACHER":
      return "/portal/teacher";
    default:
      return "/dashboard";
  }
}
