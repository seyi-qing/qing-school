# Staging checklist (Decimal + isolation)

URL: https://qing-school-staging.vercel.app  
DB: Neon **qing-school-preview** only

## Manual smoke (after each promote)

- [ ] Login as admin
- [ ] Dashboard loads with student/staff counts
- [ ] **Fees** — totals and balances in ₦ (Decimal)
- [ ] **Expenses** — P&L numbers load
- [ ] **Classes** — Delete empty class/subject (confirm dialog); blocked if students/scores
- [ ] Header **admin ▾** → Profile, Change password, Sign out
- [ ] **/onboarding** → “Portal sign in” opens `/login` (not marketing home)
- [ ] Record a cash payment on an unpaid invoice (mock mode)

## API smoke (optional)

```bash
BASE_URL=https://qing-school-staging.vercel.app \
SMOKE_EMAIL=admin@kms.sch.ng SMOKE_PASSWORD='…' \
node scripts/smoke-staging.mjs
```

## Already on staging

- Tenant isolation (leave, reports, export, bulk-assign, fees, etc.)
- Decimal money + `toMoney()` boundaries
- Class/subject delete with guards
- UserMenu profile + password + sign out
- Onboarding portal sign-in → `/login`

## Do not yet

- Merge `staging` → `main` until this checklist stays green for a few days
- Run Decimal SQL on Neon **main** until then
