# Qing School Production Hardening Status

Release target: **v1.3.0**

## P0 — Security and correctness
- [x] Fail-closed tenant resolution for authenticated school operations.
- [x] Direct schoolId added to tenant-owned child records and migration/backfill prepared.
- [x] RBAC permission contract expanded.
- [x] Session versioning, password-change revocation, and failed-login lockout added.
- [x] Setup seed/platform bootstrap disabled by default and hard-disabled in production.
- [x] Payment finalization moved into a database transaction with idempotent reference handling.
- [x] Paystack webhook verification fails closed.

## P1 — Production infrastructure
- [x] Production build no longer uses prisma db push --accept-data-loss.
- [x] Prisma production migration added for tenant fields, decimal money, and security fields.
- [x] CI typecheck/unit/build gate added.
- [ ] Final migration must be applied to the production database after preview validation and backup verification.

## P1 — Testing
- [x] Tenant fail-closed contract tests updated.
- [x] RBAC contract tests expanded.
- [ ] Full database integration test matrix still required before GA.
- [ ] Payment concurrency/integration tests still required against staging PostgreSQL.

## P2 — UX
- [x] Role-based command center dashboard.
- [x] Grouped navigation by work area.
- [ ] Complete role-specific dashboard cards for every operational role.

## P3 — Commercial polish
- [ ] Final school branding/theming pass.
- [ ] Subscription enforcement and billing lifecycle integration tests.
- [ ] Production observability/error tracking.

## Release gate
**Do not merge or deploy production until the preview deployment is READY, the Prisma migration succeeds against a staging/production-like database, and integration tests pass.**
