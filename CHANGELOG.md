# Changelog

## [1.4.0] — 2026-10-06

### Security & tenant isolation (complete remaining gaps)
- Library / hostel / transport: all mutations (PATCH/DELETE/loan/allocate/enroll) verify object belongs to session school
- Rule enforced: tenant identity from session (`resolveSchoolId`), never from client-supplied `schoolId`
- Setup seed & platform-admin impossible in production unless `ALLOW_PRODUCTION_SETUP=true`
- Seed no longer returns plaintext password in response; accounts force password change
- Login rate limiting (20 attempts / 15 min per IP+email)

### RBAC
- Central permissions: `MANAGE_LIBRARY`, `MANAGE_HOSTEL`, `MANAGE_TRANSPORT`, `MANAGE_CBT`, `MANAGE_CMS`
- Modules use `can()` instead of ad-hoc role arrays

### Financial schema
- Money columns typed as `Decimal @db.Decimal(12,2)` in Prisma schema
- **Action required once after deploy:** run `prisma db push` (or migrate) on staging/production so DB columns match. `lib/money.ts` already normalizes Decimal values.

### UX
- Dashboard leave pending count scoped by school staff

### Tests
- `lib/rate-limit.test.ts`
- Unit script includes rate-limit

### Ops
- `.env.example` documents PAYMENTS_MODE and production setup flags
- Version unified at 1.4.0

## [1.3.0] — 2026-10-06

### Security & isolation
- Transactional fee payment finalization
- Paystack webhook fails closed unless PAYMENTS_MODE=mock
- Documents / invoices / library / hostel / transport list scoping
- Production seed & platform-admin require ALLOW_PRODUCTION_SETUP

### Ops
- Production build no longer runs db push --accept-data-loss

### UX
- Role-based command-center dashboard
- Audit trail shows full date and time

## [1.2.0] — 2026-10-05

### Added
- Forced password change, multi-tenant platform shell, role-based nav

## [1.1.0] — 2026-10-04

### Added
- Multi-tenant School model, transport/hostel/library, parent portal

## [1.0.0] — 2026-09

### Added
- Initial KMS school ERP
