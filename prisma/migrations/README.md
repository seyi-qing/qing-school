# Prisma migrations (production path)

Current Vercel builds use `prisma db push --accept-data-loss` for speed on Neon.

## Recommended production process

1. Develop schema changes locally.
2. Generate a migration:
   ```bash
   npx prisma migrate dev --name describe_change
   ```
3. Commit the `prisma/migrations/` folder.
4. On production, switch build to:
   ```bash
   prisma generate && prisma migrate deploy && next build
   ```
5. Keep `db push` only for preview/demo environments.

## Tenant notes

- `School` is the tenant root.
- Prefer composite uniques `(schoolId, …)` over global name uniques.
- Backfill `schoolId` for legacy rows after adding columns (seed / platform page).
