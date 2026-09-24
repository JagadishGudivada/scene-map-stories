# Roadmap

## Code health refactor (approved plan, 2026-09-19)
- [x] Group 1.1 — Error boundary around routed area
- [x] Group 1.2 — Delete `src/App.css` and `src/components/MapSidePanel.tsx`
- [x] Group 1.3 — Unmount cleanup in the two AI search hooks
- [x] Group 1.4 — Remove `as any` cast in the static-page route
- [x] Group 2.8 — Harden AI cache (no cached failures, retry on next caller)
- [x] Group 2.7 — Shared edge payload types at every call site
- [ ] Group 2.5 — Profile data loading onto the query layer
- [ ] Group 2.6 — Title + location detail pages onto the query layer
- [ ] Group 3.9–3.11 — Split the four oversized pages
- [x] Group 3.12 — Remove the lint suppression in the fog-of-war map (refs for mount-only setup, typed GeoJSON)
- [ ] Group 4.13 — Merge overlapping location data modules
- [ ] Group 4.14 — Replace `console.error`-only failure paths with user messaging

## New
- [x] In-depth, file-by-file code review report (delivered 2026-09-23)
- [x] Review step 1: removed unused useTitleMapLocations, shared lib/titlePins.ts, memoized auth, abort location stream
- [ ] Review step 2: one cached titles-pin query shared by both map hooks
- [ ] Review step 3: send signed-in user token on title/location streaming calls

## Homepage 3D carousel
- [ ] Build responsive 3D perspective stage with active and flanking slides
- [ ] Add artwork-synced ambient backdrop with reduced-motion support
- [ ] Add drag, swipe, keyboard, arrow, and horizontal wheel controls
- [ ] Add selectable progress bars and position counter
- [ ] Verify desktop, laptop, tablet, and mobile layouts and interactions
