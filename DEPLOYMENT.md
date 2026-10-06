# Deployment

## Environment variables

Copy `.env.example` to `.env` and fill in real values — see that file for what
each variable does, and whether it's server-only or safe to expose. Never
commit `.env`. Required in production: `DATABASE_URL`,
`CUSTOMER_SESSION_SECRET`, `ADMIN_SESSION_SECRET`, `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CRON_SECRET`. Optional:
`PENDING_ORDER_EXPIRY_MINUTES` (defaults to 30).

With `NODE_ENV=production`, a missing session secret or a Razorpay key
whose mode (`rzp_test_`/`rzp_live_`) doesn't match the environment makes the
app fail loudly rather than silently falling back to something insecure —
set these before deploying, not after something breaks.

## Database migrations

- **Development** — creates/updates migrations interactively as you change
  `prisma/schema.prisma`:
  ```
  npm run db:migrate
  ```
- **Production** — applies existing migrations only, non-interactively,
  never generates a new one and never resets data:
  ```
  npm run db:migrate:deploy
  ```
  Run this as part of every deploy, before starting the app.

## Production build

```
npm run build
npm run start
```

## Admin provisioning

There is no admin sign-up UI. Create or rotate an admin account with:

```
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' npm run admin:create
```

Re-running with the same `ADMIN_EMAIL` rotates that account's password
(or promotes an existing non-admin account) instead of creating a duplicate.

## Hostinger cron (pending order expiration)

`GET` or `POST /api/cron/expire-pending-orders` releases stock/coupon usage
reserved by abandoned online-payment orders. It requires `CRON_SECRET` and
is safe to call repeatedly (a no-op when there's nothing to expire).

In Hostinger's Cron Jobs panel (or any other scheduler), call it every
5–15 minutes with the secret as either a bearer token or a query param:

```
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.example/api/cron/expire-pending-orders
```

or

```
curl "https://your-domain.example/api/cron/expire-pending-orders?secret=$CRON_SECRET"
```

No customer or admin session is needed or accepted — the secret is the only
authentication. Do not put the real value of `CRON_SECRET` in this file or
in the scheduler's job name/description if that's ever publicly visible.
