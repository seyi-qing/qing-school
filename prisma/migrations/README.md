# Migrations

## Current production path (Vercel build)
```
prisma generate && prisma db push --accept-data-loss && next build
```
`db push` keeps schema in sync without migration history. Acceptable for early SaaS; **not** ideal long-term.

## Recommended production path (next ops step)
1. Locally: `npx prisma migrate dev --name add_tenant_fields`
2. Commit `prisma/migrations/**`
3. Change build script to:
   `prisma generate && prisma migrate deploy && next build`
4. Never use `--accept-data-loss` on production after go-live.

## This release additive fields
- School billing fields
- CbtExam.schoolId, ExpenseRecord.schoolId
- Existing nullable schoolId on core models

All additive — safe for `db push` on existing KMS data.
