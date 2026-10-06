# Qing School v1.4.0 — Production Hardening

Released: 2026-10-06  
Repo: https://github.com/seyi-qing/qing-school

## What this release fixes

### Tenant isolation (complete for library / hostel / transport)
Every mutation now:
1. Derives `schoolId` from the authenticated session (`resolveSchoolId`)
2. Loads the target object and verifies `object.schoolId === session school`
3. For student-linked actions, calls `assertStudentInTenant`

Cross-tenant ID guessing returns **404** (not 403) to avoid leaking existence.

### Setup endpoints cannot accidentally run in production
- `ALLOW_PRODUCTION_SETUP=true` is required when `NODE_ENV=production` or `VERCEL_ENV=production`
- `SETUP_SECRET` must match
- Explicit `confirm=MIGRATE` / `confirm=CREATE`
- Seed forces `mustChangePassword` and no longer returns the demo password as the primary credential path

**After bootstrap:** remove `ALLOW_PRODUCTION_SETUP` and set `ALLOW_SETUP_SEED=false`.

### Payments
- Finalization is transactional + idempotent (`lib/payments-apply.ts`)
- Webhook fails closed unless `PAYMENTS_MODE=mock` (or `dev`)
- Keep `PAYMENTS_MODE=mock` until Paystack keys are live

### Money schema
All financial columns use `Decimal @db.Decimal(12, 2)`:
- Staff.monthlySalary
- TransportRoute.feeAmount
- FeeItem.amount
- Invoice.totalAmount / amountPaid
- Payment.amount
- ExpenseRecord.amount
- Payslip.gross / deductions / net

`lib/money.ts` (`toMoney`) normalizes Prisma Decimal for UI and arithmetic.

### Auth maturity
- Login rate limit: 20 attempts / 15 minutes per IP+email
- Forced password change on seed accounts
- httpOnly JWT session (existing)

### RBAC consolidation
Use `can(role, permission)` / `requirePermission` for:
- MANAGE_LIBRARY, MANAGE_HOSTEL, MANAGE_TRANSPORT, MANAGE_CBT, MANAGE_CMS
(and existing fee/student/staff permissions)

### Build safety
`npm run build` = `prisma generate && next build` (no `db push`)

## Required action after this deploy

1. Wait for Vercel build (TypeScript must pass).
2. **One-time schema sync** for Decimal columns:
   - Prefer staging first: `npx prisma db push`
   - Or production via Vercel CLI / `npm run db:push` against production `DATABASE_URL`
   - Existing float data migrates cleanly to Decimal in PostgreSQL.
3. Confirm env:
   - `PAYMENTS_MODE=mock` until keys ready
   - No `ALLOW_PRODUCTION_SETUP` left on
4. Smoke-test: login, library book edit, fee invoice, dashboard.

## Still recommended (next phases)
- Full API audit for CBT / CMS / media / admissions edge cases
- E2E CI (Playwright)
- Redis rate limit for multi-region
- Explicit `schoolId` denormalized on Invoice/Payment (optional safety)
- Live Paystack + webhook URL
- Subdomain / custom domain per tenant

## Engineering rule (non-negotiable)

> Every server-side read/write involving school data must derive tenant identity from the authenticated session, never from client-provided school IDs. Then verify the entire object graph belongs to that tenant.
