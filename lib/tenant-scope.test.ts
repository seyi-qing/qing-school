/**
 * Run: npx tsx lib/tenant-scope.test.ts
 * Lightweight isolation checks without a full test runner.
 */
import { schoolWhere } from "./tenant-scope";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(Object.keys(schoolWhere(null)).length === 0, "null schoolId → no filter");
assert(schoolWhere("abc").schoolId === "abc", "string schoolId → filter");
assert(Object.keys(schoolWhere(undefined)).length === 0, "undefined → no filter");

console.log("tenant-scope tests OK");
