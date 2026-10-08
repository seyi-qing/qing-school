# Second-school isolation probe (staging)

Goal: **School A (KMS) cannot see School B (TEST) data.**

## 1. Create TEST school on staging

1. Open https://qing-school-staging.vercel.app/onboarding
2. Fill:
   - School full name: `TEST Academy`
   - Short name: `TEST`
   - URL slug: `test` (or `test-bso`)
   - Admin email: **new** email (not `admin@kms.sch.ng`)
   - Admin password: strong (10+ chars)
3. Submit → go to **Portal sign in** (`/login`)
4. Log in as the **TEST** admin (not KMS admin)

## 2. Seed a little data as TEST admin

- Classes → add `JSS 1` + arm `A`
- Students → admit one test student
- Fees structure → one fee item (optional)

## 3. Cross-tenant checks

| As user | Action | Expected |
|---------|--------|----------|
| TEST admin | Dashboard student count | Only TEST students |
| TEST admin | Fees list | Only TEST invoices |
| KMS admin | Dashboard | KMS counts only (not TEST) |
| KMS admin | Students search | No TEST admission numbers |
| Platform admin | Switch active school | Sees one school at a time |

## 4. API probe (platform admin session)

After logging in as platform admin in the browser, copy the `kms_session` cookie value (DevTools → Application → Cookies), then:

```bash
BASE_URL=https://qing-school-staging.vercel.app \
COOKIE='kms_session=...' \
node scripts/isolation-probe.mjs
```

Or use the in-app platform **Isolation probe** button when available.

## 5. Pass criteria

- TEST admin never lists KMS students/invoices
- KMS admin never lists TEST students/invoices
- Subject names can repeat per school after schema promote
