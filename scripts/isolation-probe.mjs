/**
 * Cross-tenant isolation probe (needs PLATFORM_ADMIN or two school cookies).
 *
 *   BASE_URL=https://qing-school-staging.vercel.app \
 *   COOKIE='kms_session=...' \
 *   node scripts/isolation-probe.mjs
 */
const base = (process.env.BASE_URL || "https://qing-school-staging.vercel.app").replace(/\/$/, "");
const cookie = process.env.COOKIE || "";

if (!cookie) {
  console.error("Set COOKIE=kms_session=... from browser DevTools after platform/admin login");
  process.exit(1);
}

const headers = { Cookie: cookie, "Content-Type": "application/json" };

async function get(path) {
  const res = await fetch(`${base}${path}`, { headers });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

async function main() {
  console.log("Probe against", base);

  const me = await get("/api/auth/me");
  console.log("me", me.status, me.data);

  const students = await get("/api/students");
  console.log("students count", me.status === 200 ? (students.data.students || []).length : students.status);

  const schools = await get("/api/platform/billing");
  if (schools.status === 200 && schools.data.schools) {
    console.log(
      "schools",
      schools.data.schools.map((s) => `${s.slug}:${s.name}`).join(", ")
    );
  } else {
    console.log("platform billing", schools.status, schools.data?.error || "");
  }

  const probe = await get("/api/platform/isolation-probe");
  console.log("isolation-probe", probe.status, JSON.stringify(probe.data, null, 2).slice(0, 1500));

  if (probe.data?.ok === false) process.exit(1);
  console.log("probe finished");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
