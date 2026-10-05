# What only you can finish

These are **not** code gaps — they need accounts, DNS, or assets you control.

## 1. Live API keys (P0 for real SMS / payments)

Vercel → Project → Settings → Environment Variables (Production):

| Variable | Purpose |
|----------|---------|
| `TERMII_API_KEY` | Parent absence SMS |
| `TERMII_SENDER_ID` | Approved sender (e.g. KMS) |
| `PAYSTACK_SECRET_KEY` | Fee payments + SaaS billing |
| `PAYSTACK_PUBLIC_KEY` | Frontend Paystack |
| `PAYSTACK_PLAN_STARTER` / `_PRO` / `_ENTERPRISE` | Subscription plan codes from Paystack dashboard |

Without these, SMS and live charges stay simulated / fail silently.

## 2. Custom domain / subdomain (multi-school)

1. Add domain in Vercel (e.g. `app.yourdomain.com` and `*.yourdomain.com`).
2. Point DNS as Vercel instructs.
3. Middleware already reads subdomain → `x-school-slug`.
4. Each school’s `School.slug` must match the subdomain label.

## 3. Campus photos

Put real images in:

```
public/campus/hero.jpg
public/campus/grounds.jpg
public/campus/classroom.jpg
```

Homepage already looks for these paths; until then it uses placeholders / gradients.

## 4. Switch production from `db push` to migrations

See `prisma/migrations/README.md`. Do this on a quiet day; one-time `migrate resolve` on production.

## 5. Staging project

Recommended: second Vercel project + second Neon/Postgres DB with `DEMO_MODE=true` and `isDemo` schools only. Never point staging at the live KMS database.

## 6. Paystack subscription auto-charge

Plan limits and billing fields exist. Creating Paystack **Plans** and pasting plan codes is required before auto-renew works.
