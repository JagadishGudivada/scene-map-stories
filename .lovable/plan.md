# Profile Map Engagement Upgrade

Transform the Profile map/list view into a gamified travel journal that rewards logging locations.

## 1. Fog-of-war world map
- Replace/augment the current profile map view with a world choropleth layer.
- Countries with 0 visited spots render dimmed (muted grey overlay, low opacity).
- Countries with ≥1 visited spot "light up" gold (`amber` token) with a soft glow + one-time fade-in animation on first reveal.
- Top stat bar above the map: `X / 195 countries unlocked` with a thin gold progress bar.
- Derive country from existing `visited_spots.country` field (already stored). Map country name → ISO code via a small lookup table; unmatched names count but don't color a polygon.

Tech: Leaflet + a lightweight world GeoJSON (bundled in `src/lib/worldCountries.ts`, ~country-level low-res). No new map library.

## 2. Reveal animation on add
- Hook into the existing "add visited spot" flow (`useBeenHereSpot.toggle` / add dialog).
- On successful insert, dispatch a `spot:revealed` event carrying `{ lat, lng, name, title, category, poster }`.
- Profile map listens: `flyTo` the coords, drop an animated pin (Framer Motion bounce), then show a centered "achievement card" that flips in — poster, title, category badge, "Unlocked" label. Dismiss on click / auto after 4s.

## 3. Milestone celebrations
- Thresholds: 1, 5, 10, 25, 50 visited spots.
- New table `user_milestones (user_id, milestone int, shown_at)` so each milestone fires exactly once per user.
- After a successful add, count visited spots; if the new count matches an unseen threshold, show a confetti overlay (`canvas-confetti`) + toast-style message (e.g. "5 locations added! You're a Location Scout 🎬") and insert the milestone row.

## 4. Explorer tier badge
- Tiers by total visited spots:
  - Explorer (0–4)
  - Wanderer (5–14)
  - Location Scout (15–39)
  - Trailblazer (40+)
- Small pill badge next to the username in the Profile header (and PublicPassport header). Gold gradient background, tier icon.

## 5. Shareable journey card
- After the reveal animation, a "Share this stop" button appears in the card.
- Client-side generator using `html-to-image` (already lightweight) rendering a 1080x1920 hidden node: location name, title, category color stripe, Sarevista logo, coords.
- Download as PNG + Web Share API when available.

## 6. Nearby prompt (optional, permission-gated)
- On Profile mount, if `navigator.geolocation` permission is already granted (no forced prompt), fetch current position.
- Query `spots` table for rows within ~5km (haversine in JS on a bounded lat/lng box first, then precise filter).
- If a match and not dismissed this session, show a slim top banner: "You're near {spot.name} — mark visited?" with Mark / Dismiss.

## Files

New:
- `src/components/profile/FogOfWarMap.tsx` — Leaflet map + GeoJSON country layer + stat bar.
- `src/components/profile/RevealAchievementCard.tsx` — flip card + share button.
- `src/components/profile/MilestoneCelebration.tsx` — confetti overlay.
- `src/components/profile/TierBadge.tsx` — pill badge + tier util.
- `src/components/profile/NearbySpotBanner.tsx`.
- `src/lib/tiers.ts` — tier + milestone constants and helpers.
- `src/lib/worldCountries.ts` — GeoJSON + country-name→ISO map.
- `src/lib/shareCard.ts` — html-to-image render + share.

Edited:
- `src/pages/Profile.tsx` — mount FogOfWarMap, TierBadge, NearbySpotBanner, listen for reveal events, drive milestone celebrations.
- `src/pages/PublicPassport.tsx` — TierBadge in header.
- `src/hooks/useSaved.tsx` — `useBeenHereSpot` dispatches `spot:revealed` after insert.
- `src/components/AddLocationDialog.tsx` (or the add-visited flow) — same dispatch.

DB migration:
- `user_milestones` table with RLS (user can read/insert their own), grants for `authenticated` + `service_role`.

Dependencies to add: `canvas-confetti`, `html-to-image`. (Leaflet already installed.)

## Notes / trade-offs
- Country matching depends on `visited_spots.country` text quality; unmapped names still count in the numerator via a fallback but won't color a polygon — acceptable for v1.
- Reveal event bus is a simple `window.dispatchEvent(new CustomEvent(...))` — no global store needed.
- Nearby prompt never triggers a permission dialog on its own; it only reads an already-granted permission (checked via `navigator.permissions.query`).
