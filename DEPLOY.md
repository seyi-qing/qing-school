# Force Schools ERP — Production Deploy (GitHub + Vercel)

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
cd force-schools-erp
cp .env.example .env
# Edit .env: set SESSION_SECRET to a long random string
openssl rand -base64 48

npm run setup    # install + prisma generate + db push + seed
npm run dev      # http://localhost:3000
```

Demo logins (password for all: `Password123!`):

| Role        | Email                      |
|-------------|----------------------------|
| Admin       | admin@forceschools.test    |
| Teacher     | teacher@forceschools.test  |
| Student     | student@forceschools.test  |
| Parent      | parent@forceschools.test   |

**Before real school use:** remove the demo-account panel from `app/login/page.tsx`
and change every seeded password.

---

## Step 1 — Create Postgres (Neon — free, 2 minutes)

1. Go to https://neon.tech → Sign up → Create project.
2. Copy the connection string (looks like):
   `postgresql://user:pass@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
3. Keep it ready for Step 3 and for Vercel env vars.

---

## Step 2 — Point Prisma at Postgres

In `prisma/schema.prisma` change only the datasource block:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

(Locally you can keep SQLite in a branch; for production/Vercel use Postgres.)

---

## Step 3 — Push code to GitHub

Repo target: `https://github.com/seyi-qing/qing-school.git`

On your machine (with Git installed and logged into GitHub):

```bash
cd force-schools-erp

git init
git add .
git commit -m "Initial Force Schools ERP — production-ready foundation"

git remote add origin https://github.com/seyi-qing/qing-school.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Deploy on Vercel

1. Go to https://vercel.com → Log in with GitHub.
2. **Add New Project** → Import `seyi-qing/qing-school`.
3. Framework preset: **Next.js** (auto-detected).
4. **Environment Variables**:

| Name              | Value                                      |
|-------------------|--------------------------------------------|
| `DATABASE_URL`    | your Neon connection string                |
| `SESSION_SECRET`  | output of `openssl rand -base64 48`        |
| `PAYSTACK_SECRET_KEY` | (optional, leave empty = mock)         |
| `FLUTTERWAVE_SECRET_KEY` | (optional)                          |
| `TERMII_API_KEY`  | (optional)                                 |
| `TERMII_SENDER_ID`| `FORCESCH`                                 |

5. Deploy. First build runs `prisma generate` via `postinstall`.

### After first successful deploy — create tables + seed

```bash
npx prisma db push
npm run db:seed
```

---

## Step 5 — Post-deploy checklist

- [ ] Remove demo login buttons from `app/login/page.tsx`
- [ ] Change all seeded passwords
- [ ] Confirm `/result-checker` works without login
- [ ] Confirm Admin can log in and see Dashboard
- [ ] Set a real current term under Admin Settings
- [ ] Never commit `.env`
