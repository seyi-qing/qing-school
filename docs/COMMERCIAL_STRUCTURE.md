# KMS / Qing School — commercial structure

## Product goal
Multi-school SaaS ERP. **KMS** is the flagship tenant (`slug: kms`).

## Top-level folders
| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages & API routes |
| `app/api/` | REST handlers (auth, students, fees, transport, …) |
| `app/portal/` | Parent / student / teacher portals |
| `app/platform/` | SaaS tenant list (platform admin) |
| `app/onboarding/` | New school signup wizard |
| `components/` | UI (PortalShell, Sidebar, OfficialLetterhead, …) |
| `components/ui/` | Toast, EmptyState, ConfirmButton |
| `lib/` | auth, permissions, tenant, tenant-scope, school-config |
| `prisma/` | schema + seed; see `migrations/README.md` |
| `public/` | logo.svg and static assets |

## Tenant isolation
- `School` model is the tenant root.
- `lib/tenant-scope.ts` → `resolveSchoolId(session)` + `schoolWhere(schoolId)`.
- Scoped APIs: students, classes, notices, admissions, fees, transport, hostel, library.
- Session JWT may carry `schoolId`; legacy sessions fall back to default KMS school.

## Key public routes
- `/` — marketing homepage
- `/admissions` — online application
- `/login` — all roles
- `/result-checker` — PIN-based public results
- `/portal/parent` — family dashboard

## Ops
- Build: `prisma generate && prisma db push --accept-data-loss && next build`
- Prefer migrate deploy for production later (see `prisma/migrations/README.md`).
- Env: `DATABASE_URL`, `SESSION_SECRET`, Termii, Paystack, `SETUP_SECRET`.

## Photos
Place real campus images in `public/campus/` and reference from `app/page.tsx` when available.
