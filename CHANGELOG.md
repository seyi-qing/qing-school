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
