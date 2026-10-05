/**
 * Run: npx tsx lib/tenant-scope.test.ts
 */
import { schoolWhere } from "./tenant-scope";
import { extractPhone } from "./phone";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(Object.keys(schoolWhere(null)).length === 0, "null schoolId → no filter");
assert(schoolWhere("abc").schoolId === "abc", "string schoolId → filter");
assert(Object.keys(schoolWhere(undefined)).length === 0, "undefined → no filter");
assert(extractPhone("08012345678", null) !== null, "guardian phone extracts");
assert(extractPhone(null, "Call 08012345678 please") !== null, "notes phone extracts");
assert(extractPhone(null, "no number here") === null, "no phone → null");

console.log("P1 tests OK: tenant-scope + phone");
