

# Redesign Title Detail Page — Inspired by Reference

## What the reference image shows

The uploaded screenshot shows a **split-layout title page** with:
- **Left: Full-height interactive map** taking ~70% of the viewport, showing location pins on a dark globe/map
- **Top bar**: Logo + type badge (BOOK) + title name + year + location count + action icons (heart, comments) — all inline in the header
- **Right: Scrollable location cards sidebar** — each card has a landscape photo, location name, city tag, a green "DOCUMENTED" status badge, and a short description quote
- **Coordinates overlay** (LAT/LNG) in the bottom-left of the map
- No hero banner image — the map IS the hero

## What to adopt and improve

### Layout overhaul
Replace the current vertical scroll layout (hero image → map → location list → community → related) with a **full-viewport split layout**:

```text
┌──────────────────────────────────────────────────────────┐
│  Navigation (existing)                                    │
├───────────────────────────────────┬────────────────────────┤
│                                   │  Title + Year + Count  │
│                                   │  Type Badge            │
│       Interactive Leaflet Map     ├────────────────────────┤
│       (full height, ~65-70%)      │  Location Card 1       │
│                                   │  [photo] Name / City   │
│                                   │  "Description quote"   │
│       pins + path lines           ├────────────────────────┤
│       click pin → highlight card  │  Location Card 2       │
│                                   │  ...                   │
│  LAT/LNG overlay                  │  (scrollable)          │
├───────────────────────────────────┴────────────────────────┤
│  Below fold: Community Photos | Related Titles (unchanged) │
└────────────────────────────────────────────────────────────┘
```

### Specific changes

1. **Remove the full-bleed hero image** — replace with a full-viewport-height map+sidebar split
2. **Title info moves to the sidebar header** — title name, year, location count, type badge (styled like the reference: `BOOK` / `MOVIE` / `SERIES` pill in the nav area), and action icons (save, share, heart)
3. **Location cards in the sidebar** — each card shows:
   - Thumbnail image (from pin data or Unsplash fallback)
   - Location name (large serif font)
   - City/region tag (uppercase small badge)
   - Status badge ("DOCUMENTED" in teal/green — maps to pins that have coordinates)
   - Short description or scene reference quote
4. **Map-sidebar interaction** — clicking a pin in the map scrolls the sidebar to highlight that card; clicking a card flies the map to that pin
5. **Coordinates overlay** — show current map center LAT/LNG in the bottom-left corner of the map
6. **Path mode auto-enabled** — connect locations under 10km (already built in LeafletMap)
7. **Below-the-fold sections** remain as-is: Community Photos, Related Titles

### Files to change

| File | Change |
|------|--------|
| `src/pages/TitleDetail.tsx` | Full rewrite of the layout — split into map (left) + sidebar (right) with location cards, move title info to sidebar header, remove hero image section |
| `src/components/LeafletMap.tsx` | Minor: expose coordinate overlay option via prop |
| `src/lib/mapData.ts` | Add `image` and `description` fields to `titleLocationPins` entries for richer cards |

### Mobile behavior
On screens below `md` breakpoint, stack vertically: title info bar → map (50vh) → scrollable location cards → community/related sections.

### Design tokens used
- Glassmorphism cards for location sidebar
- Serif font for location names (existing `font-serif`)
- Teal badge for "DOCUMENTED" status
- Amber for interactive highlights
- Dark map tiles (existing Carto Dark Matter)

