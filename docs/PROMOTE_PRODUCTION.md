# Promote staging → production (when ready)

**Do not run until multi-school probe on staging passes.**

## Checklist before promote

- [ ] Staging Fees + Dashboard OK with Decimal
- [ ] Second school (TEST) onboarded on staging
- [ ] KMS admin cannot see TEST students
- [ ] TEST admin cannot see KMS students
- [ ] Smoke login API OK
- [ ] Neon **main** backup / snapshot taken

## 1. Decimal SQL on Neon **main** only

Neon console → branch **main** → SQL Editor → same ALTERs used on preview:

```sql
ALTER TABLE "FeeItem" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::DECIMAL(12,2);
ALTER TABLE "Invoice" ALTER COLUMN "totalAmount" TYPE DECIMAL(12,2) USING "totalAmount"::DECIMAL(12,2);
ALTER TABLE "Invoice" ALTER COLUMN "amountPaid" TYPE DECIMAL(12,2) USING "amountPaid"::DECIMAL(12,2);
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::DECIMAL(12,2);
ALTER TABLE "ExpenseRecord" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::DECIMAL(12,2);
ALTER TABLE "Payslip" ALTER COLUMN "gross" TYPE DECIMAL(12,2) USING "gross"::DECIMAL(12,2);
ALTER TABLE "Payslip" ALTER COLUMN "deductions" TYPE DECIMAL(12,2) USING "deductions"::DECIMAL(12,2);
ALTER TABLE "Payslip" ALTER COLUMN "net" TYPE DECIMAL(12,2) USING "net"::DECIMAL(12,2);
ALTER TABLE "Staff" ALTER COLUMN "monthlySalary" TYPE DECIMAL(12,2) USING "monthlySalary"::DECIMAL(12,2);
ALTER TABLE "TransportRoute" ALTER COLUMN "feeAmount" TYPE DECIMAL(12,2) USING "feeAmount"::DECIMAL(12,2);
```

If Subject/CbtBank `schoolId` columns were added on staging, run matching `ALTER TABLE ... ADD COLUMN` on main or `prisma db push` against main with care.

## 2. Git merge

```bash
git checkout main
git pull
git merge staging
git push origin main
```

## 3. Production Vercel

Project **qing-school** (not staging) deploys from `main`.

## 4. Smoke live

- Login production URL
- Fees totals
- One class list

## Rollback

- Redeploy previous production deployment in Vercel
- Restore Neon main from backup if schema broke
