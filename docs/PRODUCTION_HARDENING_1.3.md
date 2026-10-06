# Qing School v1.3 — Production Hardening

## Shipped

### P0 Security & data
- Transactional payments (`lib/payments-apply.ts`)
- Webhook fail-closed unless `PAYMENTS_MODE=mock`
- Tenant isolation: documents, invoices, library, hostel, transport
- Rule: school scope from session, never client `schoolId`
- Financial amounts: Decimal(12,2)
- Setup endpoints need `ALLOW_PRODUCTION_SETUP=true` in production

### P1 Ops
- `npm run build` = `prisma generate && next build` (no db push)
- Use `db:push` or `build:migrate` deliberately

### UX
- Role-based dashboard (Needs attention + quick actions)
- Audit trail shows date **and time**

## Your env
| Variable | Purpose |
|----------|--------|
| `PAYMENTS_MODE=mock` | Until Paystack keys ready |
| `PAYSTACK_SECRET_KEY` | Live charges |
| `PAYSTACK_WEBHOOK_SECRET` | Webhook HMAC |
| `TERMII_*` | SMS |
| Remove setup flags after bootstrap | |

## After deploy
1. Wait for green
2. One schema push if Decimal migration needed: Vercel CLI or `db:push` once
3. Confirm audit timestamps include time

## Still open
- Full audit of every API route
- E2E CI suite
- Rate limiting / 2FA
- Staging environment
