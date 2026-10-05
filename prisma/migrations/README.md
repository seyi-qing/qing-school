# Prisma migrations (P2)

## Production today (safe, green)

Build script remains:

```
prisma generate && prisma db push --accept-data-loss && next build
```

Do **not** switch to `migrate deploy` until you complete the baseline steps below once.

## Move to formal migrations (your ops checklist)

1. Locally with a copy of production `DATABASE_URL`:
   ```bash
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/baseline.sql
   mkdir -p prisma/migrations/20261005120000_baseline
   # Review /tmp/baseline.sql, then copy into migration.sql
   ```
2. On **production** DB (one time), mark baseline applied without running SQL:
   ```bash
   npx prisma migrate resolve --applied 20261005120000_baseline
   ```
3. Change `package.json` build to:
   ```
   prisma generate && prisma migrate deploy && next build
   ```
4. Never use `--accept-data-loss` after that.

## Scripts added

| Script | Purpose |
|--------|---------|
| `npm run db:migrate` | Dev: create migration |
| `npm run db:migrate:deploy` | Prod: apply |
| `npm run db:migrate:status` | Check drift |
| `npm run build:migrate` | Alternate build with migrate deploy |
| `npm run build:safe` | Explicit db push path (current prod) |

## Staging vs live seed

- Production KMS: `isDemo: false` on School (seed default).
- Demo / second school: create via `/onboarding` or seed with `isDemo: true`.
- Set Vercel env `DEMO_MODE=true` only on a **staging** project — never on live KMS.
