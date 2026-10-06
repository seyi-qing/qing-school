import { toMoney, moneyEquals, round2 } from "./money";

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

assert(toMoney(10.5) === 10.5, "number");
assert(toMoney("12.34") === 12.34, "string");
assert(toMoney(null) === 0, "null");
assert(moneyEquals(10, 10.005, 0.01), "equals tol");
assert(typeof round2(1.239) === "number", "round2");
console.log("money tests OK");
