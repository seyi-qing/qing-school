## 1.3.0 — Production-grade hardening — 2026-10-06

### Security & tenancy
- Fail-closed tenant resolution and direct school scoping for tenant-owned records.
- Centralized RBAC permissions expanded for operational modules.
- Shorter sessions, session-version invalidation, failed-login lockout, and password-change revocation.
- Setup/bootstrap endpoints disabled by default and unavailable in production.

### Finance & payments
- Money fields migrated from floating point to PostgreSQL Decimal(12,2).
- Manual and online payment finalization made transactional and idempotent.
- Payment balance and invoice ownership checks tightened.
- Paystack webhooks fail closed when signature verification is not configured.
- Mock payments remain available only through explicit PAYMENTS_MODE=mock and production opt-in.

### UX
- Staff dashboard moved to role-based command centers.
- Sidebar reorganized into People, Academics, Finance, Operations, and Administration workspaces.

### Delivery
- Production build uses `prisma migrate deploy`, not `db push --accept-data-loss`.
- Added automated typecheck/unit/build CI gate.

# Changelog

All notable releases of **KMS School ERP** (qing-school).

## [1.2.0] — 2026-10-05

### Added
- Forced password change for new staff and after admin password reset (`mustChangePassword`)
- `/account/password` available to **all roles** (not only Settings admins)
- Middleware blocks the rest of the app until password is changed
- Sidebar **Change password** for every role
- Version helpers (`lib/version.ts`) and release notes

### Fixed
- Attendance save for legacy students with null `schoolId` (backfill on mark)
- P1 polish: login toasts, bulk-assign toasts, notices tenant scrub

### Ops
- P2 unit tests: `npm run test:unit`
- Migration path documented; production still uses `db push` until baseline

## [1.1.0] — 2026-10-04

### Added
- Multi-tenant School model, onboarding, platform billing fields
- Transport / hostel / library modules
- Parent calm dashboard, official receipts
- Tenant isolation (P0) on students, staff, attendance, CBT, expenses

## [1.0.0] — 2026-09

### Added
- Initial KMS ERP: admissions, fees, academics, portals
