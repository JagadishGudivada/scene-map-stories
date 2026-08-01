# Sarevista Launch Plan — Cloudflare/Wrangler, Playwright smoke tests, affiliate revenue

You deploy the frontend yourself from VSCode with Wrangler to Cloudflare Workers (`wrangler.toml` is already set up as a static-assets Worker with SPA fallback). The backend (database, auth, edge functions) stays on Lovable Cloud. This plan covers production readiness, critical end-to-end tests, affiliate monetisation, and an organic launch sequence.

## Phase 1 — Production readiness

1. Confirm Wrangler auth locally (`npx wrangler login`), or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` for CI.
2. Build and deploy: `npm run build` then `npx wrangler deploy --env production`.
3. Verify deep links (`/title/:slug`, `/trails/:id`, `/map`, `/passport/:username`) resolve via SPA fallback, and mobile renders clean.
4. Attach the custom domain in Cloudflare (Workers → sarevista → Settings → Triggers → Custom Domains).
5. Once the real domain is live, update the site URL constant in `src/lib/seoSchema.ts`, `index.html`, `public/robots.txt`, and regenerate `public/sitemap.xml` via the build, then re-deploy. Every meta/SEO change needs a rebuild + re-deploy because the site is a static SPA.
6. Submit the sitemap in Google Search Console and baseline analytics.
7. Re-run the security scan and the Supabase linter before the public deploy.

## Phase 2 — Affiliate links (the pennies)

The plumbing already exists: `src/lib/affiliates.ts` holds a partner registry with an empty `AFFILIATE_IDS` map and `buildUrl` per partner, `PlanYourTripDialog` renders the cards, and `trackAffiliateClick` logs every click into `affiliate_clicks`. Right now the URLs are plain public search links with no partner ID attached, so no commission is earned. The work is to sign up, drop the IDs in, and switch the two generic links to real affiliate networks.

### 2.1 Sign up for the programmes

| Partner | Where to apply | What you get | Typical payout |
|---|---|---|---|
| Booking.com (hotels) | booking.com/affiliate-program | `aid` partner ID | 4–6% of stay commission |
| GetYourGuide (tours) | partner.getyourguide.com | `partner_id` | 8% of tour price |
| Skyscanner / Travelpayouts (flights) | Skyscanner Partners, or Travelpayouts for easier approval | marker / `associateid` | ~1–2% per booking |
| Airalo (eSIM) | airalo.com/partners | `ref` code | 10–15% |
| SafetyWing (insurance) | safetywing.com/affiliates | `referenceID` | ~10% recurring |

Approval notes: GetYourGuide and Airalo approve fast and pay well for a travel-content site. Booking.com wants a live site with real content — apply after the Cloudflare deploy with the custom domain. Skyscanner direct is strict; Travelpayouts is the practical fallback and aggregates flights + hotels under one account.

### 2.2 Wire the IDs in

- Store each ID as a query fragment in `AFFILIATE_IDS` (e.g. `booking: "aid=1234567"`, `getyourguide: "partner_id=ABC123"`). The existing `appendId` helper already appends them to every built URL, so filling the map is enough for those partners.
- Replace the two links that currently point at non-affiliate destinations:
  - **Flights** currently deep-links to Google Flights, which pays nothing. Switch `buildUrl` to the Skyscanner/Travelpayouts affiliate search URL with the marker and origin/destination params.
  - **Get Directions** (Google Maps) stays as a non-earning utility — keep it, it is a genuine user need and builds trust.
- These are public affiliate IDs, not secrets, so they belong in the codebase (not in the secrets store). Only add a secret if a partner later needs a server-side API key for live pricing.
- Add `rel="sponsored"` where missing (already present in `PlanYourTripDialog`) and keep the existing affiliate disclosure line — required by most programmes and by FTC/EU rules.

### 2.3 Expand the surface area

Same dialog, more entry points, so more clicks:

- The "Plan a visit" button on landing-page trending cards already opens the dialog. Add the same dialog to trail detail pages ("Book this trail") and city/location detail pages ("Stay near these locations").
- On trail pages, pass the trail's first stop coordinates so the hotel and tour queries are city-accurate.
- Add a compact single-line affiliate strip (flights / stay / tours) at the bottom of title detail pages, tied to the top filming city.

### 2.4 Measure and optimise

- Build a small internal report from the `affiliate_clicks` table (clicks by partner, by service, by spot) so you can see which partner and which page earn.
- Compare click counts against each partner's dashboard to spot broken deep links (a partner ID in the wrong param silently loses attribution).
- Drop or reorder partners with no conversions after the first month; card order in `AFFILIATE_PARTNERS` controls the visual order.

### 2.5 Compliance

- Keep the disclosure visible in the dialog and add a short affiliate-disclosure paragraph to the existing site pages content.
- Do not attach affiliate params to links shared into social posts unless the platform allows it (some flag affiliate links as spam).

## Phase 3 — Playwright smoke tests

Add a thin end-to-end layer for the flows that must never break. Install `@playwright/test`, add `playwright.config.ts` pointed at `http://localhost:8080`, keep specs in `e2e/` so they stay separate from the existing Vitest tests in `src/`, and add `e2e` / `e2e:ui` scripts.

| Spec | Flow | Why |
|---|---|---|
| `homepage` | `/` renders hero, search accepts input, no console errors | front door |
| `title-search` | search a known title, pick result, land on `/title/:slug` | core funnel |
| `plan-trip` | open Plan Your Trip from a spot and from a trending card, assert every partner link is an absolute https URL containing its affiliate ID | protects revenue |
| `save-to-passport` | sign in, mark a spot visited, see it on the profile | core loop |
| `public-passport` | `/passport/:username` renders and shares | viral loop |
| `trail-page` | `/trails/:id` renders map and stops | SEO landing page |
| `mobile-smoke` | one core flow at mobile viewport | most traffic |

Auth-dependent specs use the Lovable-managed Supabase session env vars; no credentials in the repo. Run `npm run test && npm run e2e` before every `wrangler deploy --env production`.

## Phase 4 — Organic launch

Lead with the memory-map positioning, not "another filming-locations map": *"Not a directory of filming locations. A personal map of the real places behind every film, series, and book you love."*

| Channel | Tactic |
|---|---|
| Product Hunt | soft launch with founder story + one "where was X filmed" example |
| Indie Hackers | build-in-public post on the pivot from directory to memory map |
| Reddit | `r/filmlocations`, `r/cinetourism`, `r/letterboxd`, `r/travel`, plus city subreddits — share a city trail and ask for local tips, space posts 1–2 weeks apart |
| X / LinkedIn | founder thread: "10 filming locations you can actually visit", with screenshots |
| Instagram / TikTok | scene-vs-real-place shorts using Scene Mode and the share cards |
| Newsletters | pitch 5–10 niche film/travel newsletters |

Launch week: deploy and verify (day 1) → Product Hunt + Indie Hackers (day 2) → X/LinkedIn (day 3) → first Reddit post (day 4) → short-form video (day 5) → newsletter outreach (day 6) → analytics review and double down (day 7).

## Phase 5 — Post-launch loop

Read analytics weekly, fix the highest-friction drop-off, add title/city pages for queries already earning impressions, repeat whatever content performed, and track affiliate revenue per page so the monetised pages get the SEO attention.

## Technical notes

- No database schema changes needed. `affiliate_clicks` already exists with anon-insert click logging and CHECK constraints.
- Affiliate IDs are public identifiers and go in `src/lib/affiliates.ts` — no secrets required.
- Optional CI: a GitHub Actions job running `npm ci`, `npm run test`, `npm run e2e`, then `npx wrangler deploy --env production`; `CLOUDFLARE_DEPLOY.md` has a starting example.
- Booking.com approval generally requires a live custom domain, so deploy first, then apply.

## Suggested order

1. Deploy to Cloudflare and attach the domain.
2. Apply to GetYourGuide, Airalo, Travelpayouts now; Booking.com once the domain is live.
3. Wire the IDs into `affiliates.ts` and switch the flights link to a real affiliate URL.
4. Expand the Plan Your Trip dialog to trail, location, and title pages.
5. Install Playwright and write the seven smoke specs.
6. Soft launch, then review clicks and traffic weekly.
