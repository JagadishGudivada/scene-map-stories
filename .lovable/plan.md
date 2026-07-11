
# Sarevista Landing Page Rebuild

Rebuild the homepage into a cinematic, narrative landing page that leads with the Sa → Re → Vista promise, concentrates gold on "places you can go," and fixes long-standing layout/collision issues.

## Design tokens (index.css / tailwind)

Add/adjust HSL tokens so gold works as two families, not one:

- `--background` → `#14100D` (warm ink)
- `--card` / surface → `#1D1712`
- `--foreground` → `#F6EFE2` (cream)
- `--muted-foreground` → `#9C8F7E` (taupe)
- `--gold-soft-from` → `#F6D9A8`, `--gold-soft-to` → `#E8A24A` (structural/neutral gold)
- `--gold-deep-from` → `#F4C77B`, `--gold-deep-to` → `#B5651D` (destination/CTA gold)
- Utility classes: `.text-gold-soft`, `.bg-gold-deep` (gradient), `.ring-gold-hairline`, `.scrim-bottom` (built-in bottom scrim gradient for image cards).

Rule enforced in components: gold-deep only on the pin icon, primary buttons, "vista" in wordmark, and the destination marker on cards. Everything else uses cream/taupe/gold-soft.

## Header (`src/components/Navigation.tsx`)

- Solid `#14100D`, 1px bottom border in `hsl(var(--border) / 0.4)`.
- Left: logo mark + `SAREVISTA` wordmark (Lora italic; "vista" in gold-deep gradient) + BETA pill.
- Right, always visible at every breakpoint (no hamburger): Search, theme toggle, notification bell, avatar, "Sign In" pill (or hidden if logged-in).
- Icons use small tap targets (≥40px) so they fit at 375px width.

## Hero carousel (`src/components/HeroBanner.tsx` rewrite)

- Full-bleed poster per slide, `rounded-3xl`, edge-to-edge on mobile.
- Built-in bottom scrim: `bg-gradient-to-t from-[#14100D] via-[#14100D]/70 to-transparent` covering ~40% height, always applied.
- Bottom-left stack, generous vertical spacing (`space-y-3` minimum, `mb-3` on title):
  1. Metadata chip: `Movie` / `Series` pill + year, on `bg-black/50 backdrop-blur`.
  2. Title in Lora italic, `text-4xl sm:text-6xl`, cream.
  3. One curated "surprising fact" line per title (new data field `hookLine`; fallback template only if missing).
  4. Two buttons: primary solid gold-deep "Find where this was filmed" → `/title/:slug`; secondary outline gold "Save to Map" (calls save-to-map hook).
- Semi-transparent circular arrow controls on left/right; dots below.

## How it works (new section)

New component `src/components/HowItWorks.tsx`, mounted directly under hero.
Three steps, horizontal on ≥sm, stacked on mobile, kept to ~1 screen height:

- 01 Watch or read — icon: `Film`
- 02 We tell you where it's real — icon: `MapPin` (gold-deep, this is the arrival step)
- 03 You go there — icon: `Compass`

Each: number in gold-soft mono, Lora italic title, Outfit-light one-liner.

## Search bar + trust line

- Existing search stays but restyled: dark pill, gold-hairline border on focus, rotating placeholder cycling every 2.5s through `Bridgerton`, `Peaky Blinders`, `The White Lotus`, `Harry Potter`.
- Filter icon on the right unchanged in behavior.
- Directly beneath: one muted line, `text-xs text-muted-foreground`: "4,200+ real locations from 380+ films & shows".

## Quick-filter chip row

New `src/components/QuickFilterChips.tsx`, horizontally scrollable single line (`overflow-x-auto whitespace-nowrap`), outlined pills:

Recently Filmed · UK Locations · Period Dramas · Most Visited · Book-to-Screen. Each navigates to `/explore?filter=<slug>`.

## Iconic filming locations section

New `src/components/IconicLocations.tsx`:

- Eyebrow `YOU MIGHT RECOGNISE THIS PLACE` in gold-soft small-caps mono.
- Header: "Iconic filming locations" (Lora italic).
- Subhead in taupe.
- Horizontally scrollable cards: full-bleed landmark photo with built-in scrim, flag + country name top-left, landmark name bottom.
- Seeded curated list (Trevi Fountain / Fushimi Inari / Highclere Castle / Dubrovnik Old Town / etc.) — 6–8 entries in `src/lib/iconicLocations.ts` using Pexels or existing image helpers, flags via `flag-icons`.

## Trending on-screen section

New `src/components/TrendingOnScreen.tsx` (replaces `TrendyScreenSpots` on the homepage, keep the old file for other consumers):

Each card must render **all** of:
- Photo + type badge (Café/Hotel/Restaurant) + optional "Viral" badge
- Flag + city name
- Venue name (Lora italic, cream)
- `AS SEEN IN` label + title + year in gold-soft mono
- One scene-specific sentence (mock data field `sceneLine`)
- Hashtag pill
- Solid gold-deep "Plan a visit" button

Seeded in `src/lib/trendingOnScreen.ts` with 4–6 items.

## Recently added

Keep existing `RecentlyVisitedSpots` carousel, but wrap in a section with clear title and remove any element that overlaps card text. Bookmark icon top-right, outline → solid gold on save.

## Spot Radar fix (`src/components/SpotRadarFab.tsx`)

Replace the expanding pill with an icon-only circular FAB (56px) at `bottom-24 right-4` (above the mobile tab bar), that expands only on tap/hover. Never permanently expanded on mobile. Preserves the existing dialog.

## Global rules enforced

- Every image card gets `.scrim-bottom` utility (built into card components, not per-page).
- Buttons: `variant="primary"` (solid gold-deep) vs `variant="ghost-gold"` (outline). Never two solid CTAs adjacent.
- All action buttons except bookmark/search carry a text label.
- Verified against 375px viewport with Playwright screenshot before shipping.

## Files

New:
- `src/components/HowItWorks.tsx`
- `src/components/QuickFilterChips.tsx`
- `src/components/IconicLocations.tsx`
- `src/components/TrendingOnScreen.tsx`
- `src/lib/iconicLocations.ts`
- `src/lib/trendingOnScreen.ts`

Edited:
- `src/index.css` — new gold tokens + `.scrim-bottom` utility
- `tailwind.config.ts` — gold-soft / gold-deep gradients, safelist
- `src/components/HeroBanner.tsx` — rebuild per spec
- `src/components/Navigation.tsx` — always-visible icons on mobile, wordmark treatment
- `src/components/SpotRadarFab.tsx` — icon-only FAB
- `src/pages/Index.tsx` — new section order: Hero → HowItWorks → Search + trust line → QuickFilterChips → IconicLocations → TrendingOnScreen → RecentlyVisited → PopularLocations
- Extend homepage titles with an optional `hookLine` (falls back if missing)

## Out of scope

- Real "4,200+ / 380+" counts (placeholder until real query added).
- Backend changes; iconic/trending data is seeded, no DB migration.
- Full theme overhaul beyond the tokens listed; existing components not on the homepage keep their current look.

Once approved I'll implement in one pass and verify at 375px.
