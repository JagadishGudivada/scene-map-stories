# Map Page — High-Fidelity Cinematic Redesign

Goal: turn `/map` from a functional search + Leaflet canvas into a striking, motion-forward discovery surface that feels premium on both desktop and mobile, without changing backend behavior or data sources.

## Design direction

- Editorial-cinematic, dark-first (matches Sarevista system): warm ink `#14100D` chrome over the map, gold-deep `#B5651D`/gold-soft `#F4C77B` accents for pins and CTAs, Lora italic for location names, Outfit for UI.
- Vignette + subtle grain overlay on the map for depth (`pointer-events-none` layer over Leaflet).
- Every surface animates in with framer-motion; ambient motion continues on idle (pin pulses, path shimmer).

## Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  Floating command bar (top, centered, expanding search)     │
│  ├─ AI search input · filter pill · path/near toggles      │
│  └─ Animated results dropdown (staggered rows)             │
│                                                             │
│  MAP CANVAS (full-bleed, vignetted)                         │
│    · Animated custom pins (gold, pulse + drop-in)          │
│    · Selected pin: expanding gold ring + orbiting dots      │
│    · Path mode: animated dashed polyline "drawing in"       │
│                                                             │
│  Left rail (desktop ≥ md): collapsible Locations list       │
│    · Motion list with reorder on filter                     │
│    · Hover row → map fly-to + pin highlight                 │
│                                                             │
│  Right/bottom: Location Detail Panel (framer sheet)         │
│    · Hero image (Pexels) with Ken-Burns pan                │
│    · Title (Lora italic), type chip, "As seen in", CTAs    │
│                                                             │
│  Bottom-left: Map Controls cluster (Path / Near Me / count) │
│  Bottom-right: Zoom + Recenter + Legend                     │
└─────────────────────────────────────────────────────────────┘
```

Mobile: command bar stays top; locations rail becomes a bottom sheet with a snap-drag (peek / half / full). Detail panel takes over as a full sheet when a pin is tapped.

## Motion system (framer-motion)

- Entry: command bar slides down + fades; controls fade up from bottom with 60ms stagger.
- Pins:
  - Mount with `initial={{ scale: 0, y: -14 }} animate={{ scale: 1, y: 0 }}` spring per marker, staggered by index (cap at 20 for perf).
  - Idle: soft pulse ring (`animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}` 2.4s loop) on featured/highlighted pins only.
  - Hover/selected: expanding gold ring + inner dot scale; label pill fades in above.
- Path mode: SVG polyline overlaid on Leaflet with `pathLength` animated 0→1 over 1.2s, then dashed "shimmer" via animated `strokeDashoffset`.
- Location list rows: `layout` prop for smooth reorder on filter/search; hover row lifts (`whileHover={{ x: 4 }}`) with gold left-border reveal.
- Detail panel: enters as `AnimatePresence` sheet with spring; hero image runs a slow Ken-Burns via `animate={{ scale: [1, 1.08], x: [0, -12] }}` 12s loop.
- Search results dropdown: staggered row reveal, AI rows get a soft sparkle sweep.
- Near Me: radius circle grows with a spring on toggle; center pulses.

## Visual polish

- Vignette overlay on top of `LeafletMap` (`inset-0 bg-[radial-gradient(...)] pointer-events-none`).
- Grain PNG at 4% opacity, mix-blend-overlay.
- Compass rose (SVG) bottom-right, gently rotating on map bearing changes.
- Custom marker SVG (gold pin with soft glow) replacing default Leaflet icon; selected variant larger with halo.
- Command bar and panels use existing `glass` utility + `border-border/60`, `shadow-card`.

## Component/file changes

New files:
- `src/components/map/MapCommandBar.tsx` — search + filter + AI dropdown (extracts existing JSX, adds motion).
- `src/components/map/MapControls.tsx` — Path / Near Me / count cluster with animated switches and radius slider.
- `src/components/map/LocationsRail.tsx` — desktop side list; mobile bottom sheet variant.
- `src/components/map/LocationDetailPanel.tsx` — replaces inline `MapSidePanel` usage on this page with cinematic version (keeps `MapSidePanel` intact for other pages).
- `src/components/map/AnimatedPinLayer.tsx` — DOM overlay that projects `displayPins` to screen coords and renders framer-motion pins on top of Leaflet (via `map.project` + `move` listener), enabling real motion (Leaflet's DivIcon can't run framer springs).
- `src/components/map/MapVignette.tsx` — vignette + grain + compass overlay.

Edited:
- `src/pages/MapPage.tsx` — compose the new components; state and data hooks unchanged (`useAILocationSearch`, `useConsolidatedMapPins`, `useNearbySpots`).
- `src/components/LeafletMap.tsx` — expose `map` events needed by the pin layer (`move`, `zoom`) via existing `onMapReady`; add optional `hidePins` prop so the base library pins can be turned off when the animated layer is active. No behavior change when the prop is omitted.

Untouched:
- Data flow, edge functions, routes, URL params, Seo, and all business logic in `MapPage.tsx`.

## Technical notes

- Animated pin layer subscribes to Leaflet `move`/`zoom` and updates a `transform: translate3d(x,y,0)` per pin in a `requestAnimationFrame` loop; framer-motion drives only enter/hover/pulse, not pan tracking, to keep 60fps.
- Cap concurrent pulsing pins to the selected + top-8 featured to protect mobile perf.
- Respect `prefers-reduced-motion`: disable pulses, Ken-Burns, and path shimmer; keep only fades.
- Reuse gold tokens (`bg-gold-deep`, `text-gold-soft`) from `index.css`; no new hardcoded colors.
- All new components typed; no changes to `src/integrations/supabase/*`.

## Out of scope

- Backend/schema changes, new AI endpoints, new data sources.
- 3D/WebGL globe.
- Redesign of `MapSidePanel` used by other pages (we add a new panel component instead).

## Acceptance

- `/map` loads with staggered chrome-in animation; pins drop in with spring stagger; selected pin has halo and orbit.
- Path mode draws the polyline progressively; toggling off reverses cleanly.
- Location list reorders smoothly when filtering; row hover flies map to pin.
- Detail panel opens as a cinematic sheet with Ken-Burns hero.
- 60fps on a mid-range phone (Chrome DevTools 4× CPU throttle) with ≤ 50 pins visible.
- Reduced-motion users get a clean static version.
