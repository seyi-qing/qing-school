# Kayvlop Magnificent School (KMS) — School ERP

Full school management system for **Kayvlop Magnificent School, Matogun**.  
Motto: *Education with Godliness*.

Built with **Next.js 14 (App Router)**, **Prisma**, **TypeScript**, and **Tailwind CSS**.

Live: https://qing-school.vercel.app

## Features

- Role-based portals: Admin, IT, Secretary, Principal, Accountant, Teacher, Student, Parent
- Online admissions with auto admission numbers (`KMS/YYYY/####`)
- Students, attendance, exams, scores, report cards, CBT
- Fees, invoices, cash/bank collection, online payments (Paystack/Flutterwave)
- Payroll, expenses, notices, SMS (Termii)
- Library, hostel, transport, leave, timetable
- Public website + result checker (PIN)
- Website CMS + theme
- CSV reports & audit trail

## Quick start (local)

```bash
npm install
cp .env.example .env
# Set SESSION_SECRET and DATABASE_URL
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Demo accounts

Password for all: `Password123!`

| Role | Email |
|------|-------|
| Admin | admin@kms.sch.ng |
| IT | it@kms.sch.ng |
| Secretary | secretary@kms.sch.ng |
| Principal | principal@kms.sch.ng |
| Accountant | accountant@kms.sch.ng |
| Teacher | teacher@kms.sch.ng |
| Student | student@kms.sch.ng |
| Parent | parent@kms.sch.ng |

Result checker demo: admission `KMS/2025/0001`, PIN `184-773-902`.

After deploy, run the setup seed once (see DEPLOY.md) to migrate accounts to `@kms.sch.ng`.

## Branding

Central config: `lib/school-config.ts`  
Logo: `public/logo.svg`  
Short name: **KMS**

## Production (Vercel + Postgres)

See **DEPLOY.md**. Required env: `DATABASE_URL`, `SESSION_SECRET`.

## License

Private — for the school deployment you control.


## v1.3.0 production hardening

The v1.3 hardening release makes tenant scope fail closed, adds direct tenant ownership to operational records, moves financial amounts to PostgreSQL Decimal(12,2), hardens payment finalization and webhook verification, disables setup/bootstrap endpoints in production, adds session invalidation and login lockout, and reorganizes the application around role-based command centers. Production deployments must use Prisma migrations; `db push --accept-data-loss` is not a production deployment mechanism.

See `docs/STATUS_P0_P3.md` for the release gate and `CHANGELOG.md` for the detailed change list.
