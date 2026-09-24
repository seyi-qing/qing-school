# Force Schools ERP (Qing School)

School management system built with **Next.js 14 (App Router)**, **Prisma**, **TypeScript**, and **Tailwind CSS**.

## Features

- Role-based portals: Admin, IT, Secretary, Principal, Accountant, Teacher, Student, Parent
- Students (admission, profiles, report cards)
- Attendance marking
- Exams & score entry with auto-grading
- Fees, invoices, cash/bank collection, mock online payments
- Payroll generation
- Notices + SMS mock integration
- CSV reports (students, debtors, attendance)
- Public homepage + result checker (PIN)
- Audit trail

## Quick start (local)

```bash
npm install
cp .env.example .env
# Set SESSION_SECRET and DATABASE_URL="file:./dev.db"
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000 — login with demo accounts (password `Password123!`).

## Demo accounts

| Role | Email |
|------|-------|
| Admin | admin@forceschools.test |
| IT | it@forceschools.test |
| Secretary | secretary@forceschools.test |
| Principal | principal@forceschools.test |
| Accountant | accountant@forceschools.test |
| Teacher | teacher@forceschools.test |
| Student | student@forceschools.test |
| Parent | parent@forceschools.test |

Result checker demo: admission `FS/2025/0001`, PIN `184-773-902`.

## Production (Vercel + Postgres)

1. Push this repo to GitHub (already at `seyi-qing/qing-school`).
2. Import project in [Vercel](https://vercel.com).
3. Create a Neon/Supabase Postgres database.
4. Set env vars in Vercel:
   - `DATABASE_URL` — Postgres connection string
   - `SESSION_SECRET` — long random string (32+ chars)
5. In `prisma/schema.prisma`, set `provider = "postgresql"` (instead of `sqlite`).
6. Deploy. Run migrations: `npx prisma db push` (or migrate) against production DB, then seed if needed.

See **DEPLOY.md** for step-by-step detail.

## Honest status

- **Real:** auth, RBAC, students, attendance, scores, fees (cash/bank), payroll, notices, reports, audit.
- **Mock by default:** Paystack/Flutterwave and Termii SMS (work in mock mode until you add API keys).
- **Before handing to a school owner:** remove demo login panel, rotate passwords, switch to Postgres, set strong `SESSION_SECRET`.

## License

Private — for the school deployment you control.
