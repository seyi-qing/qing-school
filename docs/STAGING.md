# Staging environment

| | Production | Staging |
|--|------------|---------|
| **Vercel project** | `qing-school` | `qing-school-staging` |
| **URL** | https://qing-school.vercel.app | https://qing-school-staging.vercel.app |
| **Git branch** | `main` | `staging` |
| **Neon DB branch** | `main` | `qing-school-preview` |

## Rules

1. Never point staging `DATABASE_URL` at Neon `main`.
2. Never run experimental `prisma db push` / Decimal migrations against production.
3. Merge `staging` → `main` only after staging is Ready and smoke-tested.
4. Keep `PAYMENTS_MODE=mock` on staging until intentionally testing Paystack.

## Deploy staging

Vercel project **qing-school-staging** → Settings → Git → Production Branch = `staging`.

Or manually: Deployments → Create → branch `staging`.

## Isolation progress (this branch)

- Leave list/review scoped by staff.schoolId
- Report CSVs (students, debtors, attendance) scoped by schoolId
- Classes already scoped on main

Next: remaining edges (exams, CBT, result-pins), then Decimal on staging only.
