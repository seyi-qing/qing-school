# Qing School — Path to polished multi-school SaaS

## What was already shipped (GitHub → Vercel)

Earlier work was **pushed to GitHub `main` only**. Vercel builds from that branch automatically. There is no separate “push to Vercel” step when Git integration is connected.

Production (as of login-error fix):

- Commit on `main` includes tenant isolation, payments hardening, rate-limited login, clearer login errors, password-reset APIs.
- Check Vercel → Deployments: look for **Ready** on `main`.

If the UI “shows nothing new”, hard-refresh or wait for the latest **Ready** deployment (not Error).

## Login still failing — checklist

1. Wait for deployment **Ready** after the latest commit.
2. Open login again — error text should now be specific (DB / SESSION_SECRET / invalid password).
3. Vercel → Settings → Environment Variables (Production):
   - `DATABASE_URL`
   - `SESSION_SECRET` (≥ 32 random chars)
   - `SETUP_SECRET`
4. Runtime Logs while clicking Sign in.
5. Password reset: `/account/forgot-password` (with `RESET_DEBUG=true` or `PAYMENTS_MODE=mock`, response includes `debugResetPath`).

**After adding PasswordResetToken model:** run once against production DB:

```bash
npx prisma db push
```

(or `prisma migrate deploy` when you adopt formal migrations).

## Decimal money — staging first (do not rush production)

Previous attempt to switch Float → Decimal without a full TypeScript pass broke many deploys. Policy:

1. Create a **staging** Vercel project + separate Neon database.
2. On a branch, change money fields to `Decimal @db.Decimal(12, 2)`.
3. Grep for arithmetic on `amount`, `totalAmount`, `amountPaid`, `feeAmount`, `monthlySalary`, `_sum` — wrap every site with `toMoney()`.
4. Preview deploy must be green before merge to `main`.
5. Then one controlled `db push` / migrate on production.

`lib/money.ts` already normalizes number | string | Decimal.

## Full API isolation (remaining gaps)

| Area | Status |
|------|--------|
| Library / hostel / transport / documents / invoices | Hardened |
| CBT list/create/toggle | schoolId checks present |
| CMS DELETE / media | Must verify school (media needs `schoolId` column — optional next) |
| Notices | Scoped |
| Reports / leave | Prefer join via staff/student.schoolId |

Rule: **never trust client `schoolId`**. Use `resolveSchoolId(session)` + ownership checks.

## Email password reset

- APIs: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- UI: `/account/forgot-password`, `/account/reset-password?token=`
- Tokens hashed (SHA-256), 1-hour expiry, single-use
- Without SMTP: logged to `MessageLog`; debug path returned when `RESET_DEBUG=true` or mock mode
- Production: set `SMTP_HOST` / provider later; keep `RESET_DEBUG` off

## E2E smoke

```bash
npm run test:unit
# optional with BASE_URL and credentials:
BASE_URL=https://your-app.vercel.app SMOKE_EMAIL=admin@kms.sch.ng SMOKE_PASSWORD='...' npm run test:smoke
```

## Commercial SaaS backlog

1. Staging environment  
2. Live Paystack + webhook + suspend-on-nonpay  
3. Subdomain or path-per-school  
4. Decimal money on staging → production  
5. SMTP for resets and fee receipts  
6. Playwright CI  
7. NDPR data export / delete-on-request  
