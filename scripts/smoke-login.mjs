/**
 * Smoke: login API against a deployed base URL.
 *
 *   BASE_URL=https://qing-school-seyi-qing.vercel.app \
 *   SMOKE_EMAIL=admin@kms.sch.ng SMOKE_PASSWORD='Password123!' \
 *   node scripts/smoke-login.mjs
 */
const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL || "admin@kms.sch.ng";
const password = process.env.SMOKE_PASSWORD || "Password123!";

async function main() {
  console.log("POST", `${base}/api/auth/login`);
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Non-JSON response", res.status, text.slice(0, 400));
    process.exit(1);
  }
  console.log("status", res.status, data);
  if (!res.ok) process.exit(1);
  if (!data.redirectTo) {
    console.error("Missing redirectTo");
    process.exit(1);
  }
  console.log("smoke login OK →", data.redirectTo);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
