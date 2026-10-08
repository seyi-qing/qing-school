# Decimal money — staging only

## What changed (Git branch `staging`)

Currency fields moved from `Float` → `Decimal @db.Decimal(12, 2)`:

- `FeeItem.amount`
- `Invoice.totalAmount`, `Invoice.amountPaid`
- `Payment.amount`
- `ExpenseRecord.amount`
- `Payslip.gross`, `deductions`, `net`
- `Staff.monthlySalary`
- `TransportRoute.feeAmount`

Scores / CBT marks stay `Float` (not money).

## Rule for all code

```ts
import { toMoney } from "@/lib/money";

const paid = toMoney(invoice.amountPaid);
const due = toMoney(invoice.totalAmount) - paid; // OK
// NEVER: invoice.totalAmount - invoice.amountPaid  // Decimal TS error
```

## Apply schema on Neon **qing-school-preview** only

```bash
export DATABASE_URL="postgresql://...qing-school-preview..."
npx prisma db push
npx prisma generate
```

**Do not** run this against Neon `main` (production).

## Deploy

1. Vercel **qing-school-staging** → deploy / promote branch `staging`
2. After `db push` on preview, redeploy if build needed `prisma generate`
3. Smoke: login, dashboard fees totals, record a mock payment

## Promote to production later

Only after staging is green for several days:

1. Backup Neon main
2. `prisma db push` on production URL in a maintenance window
3. Merge `staging` → `main`
