/**
 * Run: npx tsx lib/tenant-scope.test.ts
 */
import { schoolWhere } from "./tenant-scope";
import { extractPhone } from "./phone";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(Object.keys(schoolWhere(null)).length === 0, "null schoolId → no filter");
assert(Object.keys(schoolWhere(undefined)).length === 0, "undefined → no filter");
const w = schoolWhere("abc") as { OR: Array<{ schoolId: string | null }> };
assert(Array.isArray(w.OR) && w.OR.length === 2, "schoolId → OR legacy null");
assert(w.OR[0].schoolId === "abc", "first branch is schoolId");
assert(w.OR[1].schoolId === null, "second branch is null legacy");

assert(extractPhone("08012345678", null) !== null, "guardian phone extracts");
assert(extractPhone(null, "Call 08012345678 please") !== null, "notes phone extracts");
assert(extractPhone(null, "no number here") === null, "no phone → null");

console.log("tenant-scope tests OK");
