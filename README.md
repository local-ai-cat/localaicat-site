# Local AI Chat Site

Next.js marketing, checkout, and entitlement backend for the direct-download
Local AI Chat path.

## Stack

- Next.js App Router
- Paddle Billing
- Postgres
- Railway for app + database hosting

## What this app handles

- Public product site with personal/business split
- Direct-download pricing and Paddle checkout links
- Paddle billing management entrypoint
- Paddle webhook verification
- Postgres-backed entitlement snapshots
- Health/status endpoint at `/api/health`

## Required environment variables

Copy `.env.example` and fill these in:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_DIRECT_DOWNLOAD_URL`
- `PADDLE_ENVIRONMENT`
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_CUSTOMER_PORTAL_URL`
- `PADDLE_PRODUCT_PRO_MONTHLY`
- `PADDLE_PRODUCT_PRO_ANNUAL`
- `PADDLE_PRODUCT_DEVELOPER_MODE`
- `PADDLE_PRODUCT_TEAM_ANNUAL`
- `PADDLE_CHECKOUT_URL_PRO_MONTHLY`
- `PADDLE_CHECKOUT_URL_PRO_ANNUAL`
- `PADDLE_CHECKOUT_URL_DEVELOPER_MODE`
- `PADDLE_CHECKOUT_URL_TEAM_ANNUAL`
- `DATABASE_URL`

## Paddle setup notes

1. Create products for:
   - Pro Monthly
   - Pro Annual
   - Developer Mode
   - Team Annual
2. Copy the product IDs into the `PADDLE_PRODUCT_*` variables.
3. Copy the hosted checkout links into the `PADDLE_CHECKOUT_URL_*` variables.
4. Enable the Paddle customer portal and paste its URL into
   `PADDLE_CUSTOMER_PORTAL_URL`.
5. Configure a webhook endpoint:

   `https://<your-domain>/api/paddle/webhook`

6. Set the webhook secret in `PADDLE_WEBHOOK_SECRET`.

Recommended webhook events:

- `subscription.created`
- `subscription.activated`
- `subscription.updated`
- `subscription.past_due`
- `subscription.paused`
- `subscription.resumed`
- `subscription.canceled`
- `subscription.trialing`
- `transaction.completed`
- `transaction.paid`

## Local development

```bash
pnpm install
pnpm dev
```

To run the production build locally:

```bash
pnpm build
PORT=3000 pnpm start
```

## Railway deployment

This app is designed to run as:

- one Railway service for Next.js
- one Railway Postgres service

Deploy from the `localaicat-site` directory:

```bash
railway init -n localaicat-site
railway add -d postgres
railway up
```

After the first deploy:

1. Create a Railway domain with `railway domain`
2. Set `NEXT_PUBLIC_SITE_URL` to that domain
3. Add the Paddle env vars in Railway
4. Redeploy with `railway up`

## Health check

- `GET /api/health`

This returns config state plus current entitlement summary when a database is
available.
