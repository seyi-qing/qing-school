# Password reset email (SMTP)

Code path already exists: `/api/auth/forgot-password` + `PasswordResetToken`.

## Staging / production env vars

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Qing School <noreply@yourdomain.com>"
APP_URL=https://qing-school-staging.vercel.app
```

Until SMTP is set, forgot-password returns a generic success message and (if `RESET_DEBUG=true`) may expose a reset path in non-production for testing only.

**Never set RESET_DEBUG=true on production.**

## Provider options (Africa-friendly)

- Resend, Postmark, Amazon SES
- Or transactional SMS via Termii for OTP-style reset (future)
