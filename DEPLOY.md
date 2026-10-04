# Kayvlop Magnificent School (KMS) ERP — Production Deploy (GitHub + Vercel)

This guide gets the app live on Vercel with a real Postgres database.
Follow in order. Do not skip the database step — **SQLite will not work on Vercel**.

---

## Why SQLite cannot go to Vercel

Vercel runs serverless functions. The filesystem is ephemeral (wiped between
invocations). SQLite needs a persistent file. Use **Neon**, **Vercel Postgres**,
or **Supabase** (all free tiers exist). Prisma stays the same; only the
connection string and `provider` change.

---

## Step 0 — Local sanity (optional but recommended)

```bash
cd qing-school
cp .env.example .env
# Edit .env: set SESSION_SECRET to a long random string
openssl rand -base64 48

npm run setup    # install + prisma generate + db push + seed
npm run dev      # http://localhost:3000
```

Demo logins (password for all: `Password123!`):

| Role        | Email                 |
|-------------|-----------------------|
| Admin       | admin@kms.sch.ng      |
| Teacher     | teacher@kms.sch.ng    |
| Student     | student@kms.sch.ng    |
| Parent      | parent@kms.sch.ng     |

**Before real school use:** change every seeded password and disable `/api/setup/seed`.

---

## Step 1 — Create Postgres (Neon — free, 2 minutes)

1. Go to https://neon.tech → Sign up → Create project.
2. Copy the connection string (looks like):
   `postgresql://user:pass@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
3. Keep it ready for Step 3 and for Vercel env vars.

---

## Step 2 — Push to GitHub

Repo: https://github.com/seyi-qing/qing-school

---

## Step 3 — Vercel project

1. Import the GitHub repo in Vercel.
2. Framework: Next.js (auto-detected).
3. Environment variables:
   - `DATABASE_URL` — Neon/Postgres connection string
   - `SESSION_SECRET` — long random string
   - `SETUP_SECRET` — secret used to run one-time seed via `/api/setup/seed?secret=...`
4. Deploy.

---

## Step 4 — Seed production (KMS accounts)

After the first successful deploy, open once (replace SECRET):

```
https://qing-school.vercel.app/api/setup/seed?secret=YOUR_SETUP_SECRET
```

This migrates legacy `@forceschools.test` users to `@kms.sch.ng` and resets the demo password to `Password123!`.

Then log in with `admin@kms.sch.ng` / `Password123!`.
