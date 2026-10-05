# P2 engineering notes

## Automated tests (no DB required)

```bash
npx tsx lib/tenant-scope.test.ts
npx tsx lib/permissions.test.ts
# or
npm run test:unit
```

Covers: tenant `schoolWhere`, phone normalize, RBAC can().

## Migrations

Still on `db push` for Vercel green. Formal path documented in `prisma/migrations/README.md`.

## Demo vs live

- Seed respects `DEMO_MODE=true` → `School.isDemo = true`.
- Platform / onboarding creates isolated schools; flag them demo when selling trials.
