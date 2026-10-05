/**
 * Run: npx tsx lib/tenant-scope.test.ts
 */
import { schoolWhere, omitClientSchoolId } from "./tenant-scope";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(Object.keys(schoolWhere(null)).length === 0, "null → no filter");
assert(Object.keys(schoolWhere(undefined)).length === 0, "undefined → no filter");
const w = schoolWhere("sch_abc") as { schoolId: string };
assert(w.schoolId === "sch_abc", "strict schoolId");
assert(!("OR" in (w as object)), "no legacy null OR");

const stripped = omitClientSchoolId({ name: "x", schoolId: "attacker" });
assert(!("schoolId" in stripped), "client schoolId stripped");
assert((stripped as { name: string }).name === "x", "other fields kept");

console.log("tenant-scope isolation tests OK");
