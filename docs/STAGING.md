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
5. On Hobby: promote Preview → Production (or deploy branch `staging` to Production) when Production Branch UI is missing.

## Isolation progress (`staging` branch)

- Leave list/review by staff.schoolId
- Report CSVs: students, debtors, attendance
- Student export CSV by schoolId
- Result PINs tied to term → session.schoolId
- Exam scores GET checks arm → class.schoolId
- Classes, notices, payroll, CBT list (already)

## Next

- Remaining thin edges (ops export, settings if any global lists)
- Decimal money on staging only
- Playwright smoke: login + fee payment (mock)
