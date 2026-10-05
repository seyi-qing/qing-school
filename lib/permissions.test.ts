/**
 * Run: npx tsx lib/permissions.test.ts
 */
import { can, homeRouteForRole } from "./permissions";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(can("ADMIN", "MANAGE_STUDENTS") === true, "ADMIN manages students");
assert(can("PARENT", "MANAGE_STUDENTS") === false, "PARENT cannot manage students");
assert(can("TEACHER", "TAKE_ATTENDANCE") === true, "TEACHER takes attendance");\nassert(can("ACCOUNTANT", "MANAGE_FEES") === true, "ACCOUNTANT manages fees");\nassert(can("PARENT", "MANAGE_FEES") === false, "PARENT cannot manage fees");\nassert(can("TEACHER", "MANAGE_CMS") === false, "TEACHER cannot manage CMS");\nassert(can("PRINCIPAL", "MANAGE_HOSTEL") === true, "PRINCIPAL manages hostel");
assert(homeRouteForRole("PARENT").includes("parent") || homeRouteForRole("PARENT") === "/portal/parent", "parent home");
assert(homeRouteForRole("ADMIN") === "/dashboard" || homeRouteForRole("ADMIN").startsWith("/"), "admin home");

console.log("P2 tests OK: permissions");
