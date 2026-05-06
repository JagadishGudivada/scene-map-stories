# Monetize via Affiliate Links + Click Tracking

Phase 1 of the monetization roadmap. No paywall, no UI disruption — just turn existing outbound clicks into trackable, revenue-ready traffic and add 3 new high-converting service cards.

## Goals

1. Every outbound link in `PlanYourTripDialog` goes through a central, swappable affiliate config.
2. Add 3 new service cards: **Tours & Tickets**, **eSIM**, **Travel Insurance**.
3. Log every click to the database so you can see what converts before partner dashboards report.
4. Make it trivial to drop in real affiliate IDs later (one file edit).

## What gets built

### 1. Central affiliate config — `src/lib/affiliates.ts`
Single source of truth for every partner URL. Each entry exposes a `buildUrl({ origin, destination, lat, lng, spotName })` function. Generic public URLs today; later, swap in `?aid=YOUR_ID` or partner-specific deep-link params without touching components.

Partners wired:
- **Flights** → Skyscanner (`skyscanner.com/transport/flights/{from}/{to}`)
- **Hotels** → Booking.com (already used; add affiliate placeholder)
- **Directions** → Google Maps (no affiliate, kept for utility)
- **Tours & Tickets** → GetYourGuide search URL
- **eSIM** → Airalo country page
- **Travel Insurance** → SafetyWing quote page

### 2. Updated `PlanYourTripDialog`
- Replace inline URL building with calls to the affiliate config.
- Render 6 cards in a responsive 2- or 3-column grid (currently 3).
- Each card click fires a tracking call before the browser navigates (using `navigator.sendBeacon` so it doesn't block the new tab).
- Keep the existing origin auto-detect / LHR fallback exactly as is.

### 3. Click tracking — new table `affiliate_clicks`
| column | type | purpose |
|---|---|---|
| id | uuid | pk |
| user_id | uuid nullable | from auth, null for anon |
| partner | text | "skyscanner", "booking", "getyourguide", etc. |
| service | text | "flights", "hotels", "tours", "esim", "insurance", "directions" |
| spot_name | text nullable | spot the user was viewing |
| location_name | text | city/location |
| origin | text nullable | detected origin city/airport |
| destination_url | text | the full outbound URL (for debugging/audit) |
| created_at | timestamptz | default now() |

**RLS**: anyone (anon + authenticated) can INSERT (it's a public clickstream). Only authenticated users with a future `admin` role can SELECT. For now, we just block public reads.

### 4. Tracking helper — `src/lib/trackAffiliateClick.ts`
Tiny wrapper that inserts a row via the Supabase client. Fire-and-forget; never blocks navigation; silently swallows errors.

## Out of scope (next phases)

- Pro subscription / paywall — held for Phase 2.
- AI search quotas — held for Phase 2.
- Sponsored cities / titles — held for Phase 3.
- Admin dashboard to view click stats — can be added later by querying `affiliate_clicks`.

## Files touched

- **New:** `src/lib/affiliates.ts`
- **New:** `src/lib/trackAffiliateClick.ts`
- **Edit:** `src/components/PlanYourTripDialog.tsx` (use config + tracking + 3 new cards)
- **Migration:** create `affiliate_clicks` table with insert-only RLS

## How you make money once this ships

1. Sign up for: Skyscanner Partners, Booking.com Affiliate, GetYourGuide Partner, Airalo Partners, SafetyWing Affiliate (all free, all approve quickly for travel content sites).
2. Paste your affiliate IDs into `src/lib/affiliates.ts` — one line per partner.
3. Watch the `affiliate_clicks` table to see which services convert best, and reorder the cards accordingly.

Expected lift: with even modest traffic, GetYourGuide + Booking typically out-earn flights 3–5×. The new "Tours" card alone is likely your biggest revenue driver.
