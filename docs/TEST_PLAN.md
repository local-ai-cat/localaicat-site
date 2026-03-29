# Local AI Cat Site — Test Plan

Last updated: 2026-03-28

## Environments

| Environment | URL | Polar API | Purpose |
|-------------|-----|-----------|---------|
| Staging | meow.localaicat.com | sandbox-api.polar.sh | Test all flows before prod |
| Production | localaicat.com | api.polar.sh | Live |

---

## 1. Navigation & Layout

### 1.1 Header
- [ ] Logo links to `/`
- [ ] Brand icon swaps between personal/business on home page
- [ ] Brand tagline swaps between personal/business on home page
- [ ] Desktop nav links work: Download, Manage, Support
- [ ] Header hides on scroll down (after ~80px)
- [ ] Header reappears immediately on scroll up
- [ ] Sticky header has backdrop blur

### 1.2 Mobile Nav (< 760px)
- [ ] Hamburger icon visible, desktop nav hidden
- [ ] Tap hamburger opens dropdown with correct links
- [ ] Tap link closes dropdown and navigates
- [ ] Press Escape closes dropdown
- [ ] Tap outside closes dropdown
- [ ] No horizontal overflow on any mobile page

### 1.3 Footer
- [ ] Footer links work: Privacy, Terms, Licenses, Support
- [ ] Right-aligned on mobile/tablet
- [ ] Centered/spaced on desktop

---

## 2. Home Page (`/`)

### 2.1 Business Mode (default)
- [ ] Cat business image loads and is visible on first visit
- [ ] Headline: "Serious local AI.\nFor teams."
- [ ] Tagline: "Secure AI, transcription, window management and wellness."
- [ ] Floating cats fade out
- [ ] Brand icon in header swaps to business
- [ ] Favicon changes to business cat
- [ ] "Two lanes" section: Team + Enterprise cards
- [ ] Team card "Get started" → `/team`
- [ ] Team card "View pricing" → `/pricing/direct`
- [ ] Enterprise card "Contact sales" → `/contact`

### 2.2 Personal Mode
- [ ] Cat personal image loads and is visible
- [ ] Headline: "Private AI.\nYour device."
- [ ] Tagline: "...Just you and your cat."
- [ ] Floating cats animate across screen
- [ ] Floating cats visible on mobile (smaller, subtler)
- [ ] Scroll hint arrow bounces gently
- [ ] "Choose your path" section: Outdoor Cat + Indoor Cat cards
- [ ] Section reveal animates on scroll into view

### 2.3 Mode Switch Drag
- [ ] Drag slider right → switches to business
- [ ] Drag slider left → switches to personal
- [ ] Images crossfade smoothly during drag
- [ ] Releasing mid-drag snaps to nearest mode
- [ ] Works on touch devices

### 2.4 Personal Mode Cards
- [ ] Outdoor Cat card: "Download" → `/download/direct`, "Pricing" → `/pricing/direct`
- [ ] Indoor Cat card: "App Store" → `/download/app-store`, "Pricing" → `/pricing/app-store`

---

## 3. Team Checkout (`/team`)

### 3.1 Seat Picker
- [ ] Default: 2 seats
- [ ] Minus button disabled at 2
- [ ] Plus button works up to 100
- [ ] Direct input accepts numbers 2–100
- [ ] Input clamps to min/max on blur
- [ ] Spinner arrows hidden (number input)

### 3.2 Tiered Pricing
- [ ] 2–10 seats: £40/seat/yr (tier highlighted)
- [ ] 11–25 seats: £35/seat/yr (tier highlighted at 11+)
- [ ] 26+ seats: £30/seat/yr (tier highlighted at 26+)
- [ ] Total updates live: seats × tier price
- [ ] Checkout button label updates: "Checkout — £{total}/yr"

### 3.3 Checkout Flow (Staging)
- [ ] Click "Checkout" → loading state shows "Redirecting..."
- [ ] Redirects to Polar sandbox checkout
- [ ] Polar checkout shows correct seat count
- [ ] Polar checkout shows correct GBP price
- [ ] Complete with test card (4242 4242 4242 4242)
- [ ] Redirects to `/success?checkout_id=...`
- [ ] Success page shows license key activation

### 3.4 Error States
- [ ] Kill network → "Could not connect. Please try again."
- [ ] API returns 503 → error message displayed
- [ ] Button re-enables after error

### 3.5 Info Cards
- [ ] "What each seat gets" — 4 bullet items
- [ ] "Need more?" — links to `/contact`

---

## 4. Individual Checkout Flow

### 4.1 Pro Monthly
- [ ] `/pricing/direct` → "Buy monthly" → `/buy/pro-monthly` → Polar checkout
- [ ] Polar shows £4/mo GBP recurring
- [ ] Complete → `/success` with license key

### 4.2 Pro Annual
- [ ] `/pricing/direct` → "Buy annual" → `/buy/pro-annual` → Polar checkout
- [ ] Polar shows £40/yr GBP recurring
- [ ] Complete → `/success` with license key

### 4.3 Developer Mode
- [ ] `/pricing/direct` → "Unlock Developer Mode" → `/buy/developer-mode` → Polar checkout
- [ ] Polar shows £10 one-time GBP
- [ ] Complete → `/success` with license key

### 4.4 Invalid Slug
- [ ] `/buy/nonexistent` → redirects to `/contact`

### 4.5 Missing Checkout URL
- [ ] If env var empty → `/buy/pro-monthly` redirects to `/contact?plan=pro-monthly`

---

## 5. Success Page (`/success`)

### 5.1 With License Key (from checkout_id)
- [ ] Shows "Open app and activate" button
- [ ] Button href is `localaichat://activate-license?license_key=...`
- [ ] Shows portal/email reference text
- [ ] Download, pricing, and portal links work

### 5.2 With Direct License Key Param
- [ ] `/success?license_key=abc123` → shows activation button
- [ ] `/success?key=abc123` → also works
- [ ] `/success?licenseKey=abc123` → also works

### 5.3 Without License Key
- [ ] Shows manual 4-step activation instructions
- [ ] No "Open app" button shown
- [ ] Manual-key-first note is present for Indoor Cat / Outdoor Cat crossover

### 5.4 Continue Section
- [ ] "Download direct build" → `/download/direct`
- [ ] "Compare direct plans" → `/pricing/direct`
- [ ] Portal link → Polar customer portal (if configured)
- [ ] Fallback → `/manage` (if portal URL not set)

---

## 6. Cancel Page (`/cancel`)
- [ ] Shows "no charge was completed" message
- [ ] Links work: `/#download-paths`, `/download`, `/contact`

---

## 7. Manage Page (`/manage`)
- [ ] Shows Polar customer portal link (if `POLAR_CUSTOMER_PORTAL_URL` set)
- [ ] Lists management features (payment, subscriptions, invoices, licenses)
- [ ] Explains the manual-key-first licensing model clearly

---

## 8. Pricing Pages

### 8.1 Direct Pricing (`/pricing/direct`)
- [ ] 3 personal plan cards: Pro Monthly, Pro Annual, Developer Mode
- [ ] Pro Annual highlighted (featured)
- [ ] Business section: Team + Enterprise
- [ ] Team "Get started" → `/team`
- [ ] Enterprise "Contact sales" → `/contact`
- [ ] All CTA buttons link correctly

### 8.2 App Store Pricing (`/pricing/app-store`)
- [ ] 3 plan cards (no CTAs — Apple handles billing)
- [ ] "Open App Store" link works
- [ ] Explains Apple billing model

---

## 9. Download Pages

### 9.1 Download Hub (`/download`)
- [ ] Two route cards: Direct + App Store
- [ ] Both link to correct sub-pages

### 9.2 Direct Download (`/download/direct`)
- [ ] Shows download button or "coming soon" based on env var
- [ ] Install script command displayed
- [ ] Activation steps listed
- [ ] Links to `/pricing/direct` and `/manage`

### 9.3 App Store Download (`/download/app-store`)
- [ ] "Open App Store" links to configured URL
- [ ] Indoor Cat explains Apple billing and website key redemption
- [ ] "Good to know" section is present
- [ ] Links to `/pricing/app-store`

---

## 10. Content Pages

### 10.1 Support (`/support`)
- [ ] 6 FAQ cards render
- [ ] Support email: `support@localaicat.com`
- [ ] All answers are substantive (no placeholder text)

### 10.2 Contact (`/contact`)
- [ ] Enterprise section: `serious@localaicat.com`
- [ ] Support section: `support@localaicat.com`
- [ ] Clear distinction between self-serve and sales-led

### 10.3 Privacy (`/privacy`)
- [ ] Last updated date shown
- [ ] TL;DR callout box
- [ ] `privacy@localaicat.com` listed

### 10.4 Terms (`/terms`)
- [ ] Last updated date shown
- [ ] `legal@localaicat.com` listed

### 10.5 Licenses (`/licenses`)
- [ ] All 15 Swift packages listed
- [ ] `legal@localaicat.com` listed

### 10.6 Window Management (`/window-management`)
- [ ] Feature explanation clear
- [ ] App Store limitation noted
- [ ] `support@localaicat.com` listed

---

## 11. API Routes

### 11.1 `/buy/[slug]` (GET)
- [ ] Valid slugs redirect to Polar checkout URL
- [ ] Invalid slugs redirect to `/contact`
- [ ] Missing env var redirects to `/contact?plan={slug}`

### 11.2 `/api/team-checkout` (POST)
- [ ] Path 1: Seat-based product → creates checkout with seats param
- [ ] Path 2: Pro Annual fallback → creates checkout with metadata
- [ ] Path 3: Static link fallback → returns checkout URL
- [ ] Returns `{ url: "..." }` on success
- [ ] Returns `{ error: "..." }` with 503 on total failure
- [ ] Seats clamped to 2–100

### 11.3 `/api/checkout/[id]` (GET)
- [ ] Valid checkout_id → returns `{ license_key: "..." }`
- [ ] Invalid checkout_id → returns 404
- [ ] Unconfirmed checkout → returns 422
- [ ] Missing admin key → returns 503

### 11.4 `/api/health` (GET)
- [ ] Returns 200

---

## 12. Responsive / Cross-Browser

### 12.1 Breakpoints
- [ ] Desktop (> 1120px): Full grid layouts, desktop nav
- [ ] Tablet (760–1120px): 2-column grids, desktop nav
- [ ] Mobile (< 760px): Single column, hamburger nav, stacked cards

### 12.2 Devices to Test
- [ ] iPhone Safari (latest)
- [ ] iPad Safari (latest)
- [ ] Mac Safari
- [ ] Mac Chrome
- [ ] Mac Firefox

### 12.3 Mobile-Specific
- [ ] No horizontal scroll on any page
- [ ] Touch targets ≥ 44px
- [ ] Mode switch works with touch/drag
- [ ] Seat picker +/- buttons tappable
- [ ] Buttons full-width on mobile

---

## 13. Edge Cases

### 13.1 Environment Variables
- [ ] Missing `POLAR_ADMIN_KEY` → team checkout falls back to static link
- [ ] Missing `POLAR_PRODUCT_ID_TEAM_ANNUAL` → team checkout uses Pro Annual path
- [ ] Missing `POLAR_CUSTOMER_PORTAL_URL` → manage page shows instructions
- [ ] Missing `NEXT_PUBLIC_DIRECT_DOWNLOAD_URL` → download page shows "coming soon"
- [ ] All checkout URLs missing → `/buy/*` redirects to `/contact`

### 13.2 Polar API
- [ ] Expired admin key → graceful fallback (no 500 errors)
- [ ] Polar API down → team checkout shows user-friendly error
- [ ] Checkout session expired → success page shows manual steps

---

## 14. Staging → Production Deploy Checklist

Before deploying to production:

- [ ] All staging tests above pass on meow.localaicat.com
- [ ] Polar seat-based pricing enabled on prod org
- [ ] `POLAR_PRODUCT_ID_TEAM_ANNUAL` set in Vercel prod env
- [ ] `POLAR_ADMIN_KEY` is valid (not expired) in Vercel prod env
- [ ] Run `npm run deploy:prod` or `./scripts/deploy.sh prod`
- [ ] Verify home page loads on localaicat.com
- [ ] Verify `/team` checkout redirects to prod Polar (not sandbox)
- [ ] Verify `/success` license key lookup works against prod API
- [ ] Verify customer portal link in `/manage` goes to prod portal

---

## Test Card Numbers (Polar Sandbox)

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 3220 | 3D Secure required |

Use any future expiry date and any 3-digit CVC.
