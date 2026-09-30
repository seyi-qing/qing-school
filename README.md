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

Result checker demo: admission `KMS/2026/0001`, PIN `184-773-902`.

> **Note:** Existing production DB may still have `@forceschools.test` accounts until you re-seed. Use those if login fails with the new emails.

## Branding

Central config: `lib/school-config.ts`  
Logo: `public/logo.svg`  
Short name: **KMS**

## Production (Vercel + Postgres)

See **DEPLOY.md**. Required env: `DATABASE_URL`, `SESSION_SECRET`.

## License

Private — for the school deployment you control.
