# Local AI Chat Site

Next.js marketing and checkout site for the direct-download Local AI Chat path.

## Related Repositories

- **Private app source**: [local-ai-cat/Local-AI-Chat](https://github.com/local-ai-cat/Local-AI-Chat)
- **Direct-download releases**: [localaicat-site releases](https://github.com/local-ai-cat/localaicat-site/releases/latest)
- **Product website**: [localaicat.com](https://localaicat.com)

This repository hosts the public website and release artifacts for the Outdoor
direct-download channel. App source, Xcode project generation, and App Store
release automation live in the private app repository.

## Stack

- Next.js App Router
- Polar (checkout, billing, license keys, customer portal)
- Vercel (hosting)

## What this app handles

- Public product site with personal/business split
- Direct-download pricing and Polar checkout links
- Direct install script at `/install/direct`
- Billing management entrypoint (links to Polar customer portal)
- Health/status endpoint at `/api/health`

## Required environment variables

Copy `.env.example` and fill these in:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_DIRECT_DOWNLOAD_URL`
- `NEXT_PUBLIC_DIRECT_DOWNLOAD_FILENAME`
- `NEXT_PUBLIC_DIRECT_DOWNLOAD_SHA256`
- `POLAR_CHECKOUT_URL_PRO_MONTHLY`
- `POLAR_CHECKOUT_URL_PRO_ANNUAL`
- `POLAR_CHECKOUT_URL_DEVELOPER_MODE`
- `POLAR_CHECKOUT_URL_TEAM_ANNUAL`
- `POLAR_CUSTOMER_PORTAL_URL`
- `POLAR_ADMIN_KEY`
- `ACTIVATION_TOKEN_SECRET`
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` from Vercel's Upstash for Redis integration

Optional distribution variables:

- `NEXT_PUBLIC_DIRECT_DOWNLOAD_VERSION`
- `NEXT_PUBLIC_DIRECT_DOWNLOAD_BUILD`
- `NEXT_PUBLIC_DIRECT_DOWNLOAD_PUBLISHED_AT`
- `NEXT_PUBLIC_HOMEBREW_TAP`
- `NEXT_PUBLIC_HOMEBREW_CASK`

If `NEXT_PUBLIC_DIRECT_DOWNLOAD_URL` is configured, the site also serves a shell
installer at `/install/direct` that downloads and installs the current direct build.
For GitHub `releases/latest/download/...` URLs, the installer now derives
version/build/date from the live `appcast.xml` automatically. Set the optional
release metadata vars only if you need to override that or if you host the DMG
outside GitHub Releases.

## Polar setup notes

1. Products are configured in the Polar dashboard:
   - Pro Monthly
   - Pro Annual
   - Developer Mode
   - Team Annual (seat-based)
2. Enable license key benefits on each product in the Polar dashboard.
3. Copy the hosted checkout links into the `POLAR_CHECKOUT_URL_*` variables.
4. Copy the customer portal URL into `POLAR_CUSTOMER_PORTAL_URL`.

Polar handles license issuance, entitlements, and customer portal natively.
The direct-download app remains free to install; Polar is used for upgrades,
billing management, and license keys validated by the app.

A checkout ID alone never reveals a license. A new buyer's Polar redirect proof
is captured in a five-minute HttpOnly cookie and removed from the URL before
rendering. The server verifies that proof against Polar and matches the buyer to
the checkout before revealing its exact order's key. Returning buyers whose
checkout does not include proof sign in through Polar's customer portal.

Buyers copy the verified key into **Settings → Activate License** in the app.
Custom-scheme activation tokens are no longer issued or redeemed: another app
can register the same URL scheme and intercept them. The old token endpoints
return HTTP 410. Sensitive pages disable analytics and caching.

For production, configure:

- `ACTIVATION_TOKEN_SECRET` as a dedicated secret for checkout-bound reveal cookies.
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` from the Vercel Marketplace
  `upstash/upstash-kv` integration for one-time buyer claims and shared quotas.

Both are required. Checkout creation and first-time license reveal fail closed
when shared quota storage is unavailable. There is no fallback to
`POLAR_ADMIN_KEY` for cookie signing. For local development use a separate long
random secret and a development Redis database.

## Local development

```bash
pnpm install
pnpm dev
```

To run the production build locally:

```bash
pnpm build
pnpm start
```

## Vercel deployment

Both Vercel projects deploy through Vercel's GitHub integration; no GitHub
workflow or stored Vercel token is involved.

| Project | Domain | Production branch | Polar |
|---|---|---|---|
| `localaicat-site` | localaicat.com | `main` | production |
| `localaicat-site-staging` | meow.localaicat.com | `staging` | sandbox |

- Pushes to `main` deploy production. Pull requests get previews on the
  production project only.
- Pushes to `staging` deploy meow.localaicat.com. The staging project has
  preview deployments turned off and an Ignored Build Step
  (`[ "$VERCEL_GIT_COMMIT_REF" != "staging" ]`), so it builds nothing but the
  `staging` branch; it also posts no PR comments.
- To put main on staging: `git push origin origin/main:staging` (fast-forward).

## Health check

- `GET /api/health`

Returns build commit SHA and timestamp.

- `GET /api/health/billing` with `Authorization: Bearer $BILLING_HEALTH_TOKEN`

The weekly billing check. It returns JSON with `ok` and one `{ ok, detail }`
entry per check, and answers 200 when all pass, 503 when any fails, 401 for
a wrong token and 404 when `BILLING_HEALTH_TOKEN` is unset. It checks:

- the billing variables are set and Team sells seats;
- `POLAR_ADMIN_KEY` works (one authenticated read, `checkouts:read`);
- Upstash Redis answers a ping;
- `NEXT_PUBLIC_SITE_URL` is the origin the check was called on;
- each hosted checkout link (Pro Monthly, Pro Annual, Developer Mode) still
  returns buyers to `/success` on this site, and so does Team's own checkout.

Every call is a read. The link checks list the organization's checkout links
with the admin key, which needs `checkout_links:read`; a key without that
scope reports them as `skipped`, which still counts as passing. No value is
ever echoed.

`node scripts/billing-health.mjs [--url …]` calls the route for a launchd job:
the token comes from `$BILLING_HEALTH_TOKEN` or the keychain item
`localaicat-billing-health`; exit 0 is healthy, 1 a failed check, 2 no answer.
