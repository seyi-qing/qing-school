# Multi-tenant foundation

## Platform admin UX
- `/platform` uses PortalShell (navy sidebar).
- **Work as this school** sets cookie `kms_active_school` so Students/Fees scope to that tenant.
- Default active school = KMS.

## Code
- `lib/tenant-scope.ts` — resolveSchoolId, schoolWhere (strict), omitClientSchoolId, asserts, isSchoolSuspended
- `POST /api/platform/active-school` — set active tenant for platform admin

## Tests
```bash
npx tsx lib/tenant-scope.test.ts
```

## Yours (not code)
| Item |
|------|
| Termii + Paystack keys on Vercel |
| Paystack plan codes + webhook |
| Wildcard DNS for subdomains |
| Staging DB |
| Prisma migrate baseline |
| Confirm backfill: GET/POST `/api/setup/backfill-tenant` |

## Capacity
KMS + 1–2 pilots now; 10–20 after keys + discipline; 50–200 after live billing + subdomain.
