# Tenant backfill & isolation

## What we did

1. **`backfillSchoolIds(kmsId)`** assigns every `schoolId: null` row to the KMS school (`slug: "kms"`):
   users (except PLATFORM_ADMIN), students, staff, classes, notices, CMS, sessions, audit logs, library, hostel, transport, CBT, expenses.

2. **`schoolWhere(schoolId)` is strict** — `{ schoolId }` only. A second school never sees KMS or unassigned rows.

3. **`ensureDefaultSchool()`** runs the backfill when leftover null students exist (idempotent).

4. **Manual trigger:** `POST /api/setup/backfill-tenant` as Admin / IT.

## After deploy

1. Log in as KMS admin.
2. Open Dashboard once, **or** call:
   `POST /api/setup/backfill-tenant` while logged in as Admin.
3. Confirm staff/students still show for KMS.
4. Create a second school via Onboarding — its admin must see empty lists, not KMS data.

## Keys (you)

Termii + Paystack on Vercel when ready — unrelated to isolation.
