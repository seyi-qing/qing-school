/**
 * Run: npx tsx lib/tenant-scope.test.ts
 */
import { schoolWhere, omitClientSchoolId } from "./tenant-scope";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertThrows(fn: () => unknown, msg: string) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(msg);
}

assertThrows(
  () => schoolWhere(null),
  "null schoolId must fail closed"
);

assertThrows(
  () => schoolWhere(undefined),
  "undefined schoolId must fail closed"
);

const w = schoolWhere("sch_abc") as { schoolId: string };
assert(w.schoolId === "sch_abc", "strict schoolId");
assert(!("OR" in (w as object)), "no legacy null OR");

const stripped = omitClientSchoolId({
  name: "x",
  schoolId: "attacker",
});

assert(!("schoolId" in stripped), "client schoolId stripped");
assert(
  (stripped as { name: string }).name === "x",
  "other fields kept"
);

console.log("tenant-scope isolation tests OK");
