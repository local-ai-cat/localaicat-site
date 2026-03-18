# Local AI Chat Site

Next.js marketing and checkout site for the direct-download Local AI Chat path.

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
- `NEXT_PUBLIC_DIRECT_DOWNLOAD_VERSION`
- `NEXT_PUBLIC_DIRECT_DOWNLOAD_FILENAME`
- `NEXT_PUBLIC_DIRECT_DOWNLOAD_SHA256`
- `POLAR_CHECKOUT_URL_PRO_MONTHLY`
- `POLAR_CHECKOUT_URL_PRO_ANNUAL`
- `POLAR_CHECKOUT_URL_DEVELOPER_MODE`
- `POLAR_CHECKOUT_URL_TEAM_ANNUAL`
- `POLAR_CUSTOMER_PORTAL_URL`

Optional distribution variables:

- `NEXT_PUBLIC_HOMEBREW_TAP`
- `NEXT_PUBLIC_HOMEBREW_CASK`

If `NEXT_PUBLIC_DIRECT_DOWNLOAD_URL` is configured, the site also serves a shell
installer at `/install/direct` that downloads and installs the current direct build.

## Polar setup notes

1. Products are configured in the Polar dashboard:
   - Pro Monthly
   - Pro Annual
   - Developer Mode
   - Team Annual (seat-based)
2. Enable license key benefits on each product in the Polar dashboard.
3. Copy the hosted checkout links into the `POLAR_CHECKOUT_URL_*` variables.
4. Copy the customer portal URL into `POLAR_CUSTOMER_PORTAL_URL`.

Polar handles webhooks, entitlements, license key generation, and customer
portal natively. No backend database or webhook processing is needed on this
site.

The direct-download app remains free to install. Polar is only used for
upgrades, billing management, and license keys that the app validates locally.

The success page also supports `license_key`, `licenseKey`, or `key` query
parameters and can deep-link into the app with
`localaichat://activate-license?...` for direct activation handoff.

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

This site is deployed via Vercel's GitHub integration:

1. Connect the GitHub repo in the Vercel dashboard
2. Set the root directory to `localaicat-site`
3. Framework preset: Next.js (auto-detected)
4. Add environment variables in the Vercel dashboard
5. Pushes to `main` auto-deploy to production

Preview deployments are created for each pull request.

## Health check

- `GET /api/health`

Returns build commit SHA and timestamp.
