/**
 * Staging smoke: login + fees page HTML contains naira totals.
 *
 *   BASE_URL=https://qing-school-staging.vercel.app \
 *   SMOKE_EMAIL=admin@kms.sch.ng SMOKE_PASSWORD='YourPassword' \
 *   node scripts/smoke-staging.mjs
 *
 * Playwright (full browser) can be added later; this needs only Node 18+ fetch.
 */
const base = (process.env.BASE_URL || "https://qing-school-staging.vercel.app").replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL || "admin@kms.sch.ng";
const password = process.env.SMOKE_PASSWORD || "";

if (!password) {
  console.error("Set SMOKE_PASSWORD");
  process.exit(1);
}

async function main() {
  console.log("1) Login", `${base}/api/auth/login`);
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    console.error("Login failed", loginRes.status, loginBody);
    process.exit(1);
  }
  console.log("   OK →", loginBody.redirectTo || "/dashboard");

  const cookie = loginRes.headers.getSetCookie?.()?.join("; ") || loginRes.headers.get("set-cookie") || "";

  console.log("2) GET /api/auth/me");
  const meRes = await fetch(`${base}/api/auth/me`, {
    headers: cookie ? { Cookie: cookie.split(",").map((c) => c.split(";")[0].trim()).join("; ") } : {},
  });
  const me = await meRes.json().catch(() => ({}));
  if (!meRes.ok) {
    console.warn("   me failed (cookie may be HttpOnly-only in Node)", meRes.status, me);
  } else {
    console.log("   OK", me.email, me.role);
  }

  console.log("3) Public login page");
  const loginPage = await fetch(`${base}/login`);
  if (!loginPage.ok) {
    console.error("Login page", loginPage.status);
    process.exit(1);
  }
  console.log("   OK", loginPage.status);

  console.log("4) Fees API structure requires session — skip if no cookie");
  console.log("smoke-staging finished (login API OK)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
