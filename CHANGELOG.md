# Changelog

## [1.3.0] — 2026-10-06

### Security & isolation
- Transactional fee payment finalization
- Paystack webhook fails closed unless PAYMENTS_MODE=mock
- Documents / invoices / library / hostel / transport tenant checks
- Production seed & platform-admin require ALLOW_PRODUCTION_SETUP

### Data
- Financial amounts use Decimal(12,2) instead of Float

### Ops
- Production build no longer runs db push --accept-data-loss
- Version unified at 1.3.0

### UX
- Role-based command-center dashboard
- Audit trail shows full date and time

### Docs
- docs/PRODUCTION_HARDENING_1.3.md

## [1.2.0] — 2026-10-05

### Added
- Forced password change, multi-tenant platform shell, role-based nav

## [1.1.0] — 2026-10-04

### Added
- Multi-tenant School model, transport/hostel/library, parent portal

## [1.0.0] — 2026-09

### Added
- Initial KMS school ERP
