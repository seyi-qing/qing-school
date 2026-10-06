import { checkRateLimit, clearRateLimit, _resetRateLimitStore, rateLimitKey } from "./rate-limit";

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

_resetRateLimitStore();

const key = rateLimitKey("127.0.0.1", "test@example.com");
for (let i = 0; i < 20; i++) {
  const r = checkRateLimit(key, { max: 20, windowMs: 60_000 });
  assert(r.ok, `attempt ${i + 1} should pass`);
}
const blocked = checkRateLimit(key, { max: 20, windowMs: 60_000 });
assert(!blocked.ok, "21st attempt should block");

clearRateLimit(key);
const afterClear = checkRateLimit(key, { max: 20, windowMs: 60_000 });
assert(afterClear.ok, "after clear should pass");

console.log("rate-limit tests OK");
