

# Add Search-as-you-type with Fly-to on Map Page

## What
Enhance the existing search bar on `/map` so that as the user types, a dropdown appears below the search input showing matching locations. Clicking a result flies the map to that marker and opens the side panel.

## How

### 1. Expose map instance from LeafletMap
- Add an optional `onMapReady` callback prop to `LeafletMap` that passes the `L.Map` instance to the parent
- Call it after map initialization so `MapPage` can trigger `flyTo`

### 2. Build search dropdown in MapPage
- When `searchQuery` has 2+ characters, show a dropdown below the search bar listing matching pins (max ~8 results)
- Each result shows the pin's label, title, and a colored type badge
- Animate with Framer Motion (fade in/out)
- Click a result → call `map.flyTo([pin.lat, pin.lng], 14)` and open the side panel via `setSelectedPin(pin)`

### 3. Highlight matched marker
- Pass a `highlightedPin` prop to `LeafletMap`
- When set, add a pulsing ring effect around that marker using a second `L.circleMarker` overlay with CSS animation
- Clear on panel close or new search

### Files Changed
| File | Change |
|---|---|
| `src/components/LeafletMap.tsx` | Add `onMapReady` callback prop, add `highlightedPin` prop with pulsing circle overlay |
| `src/pages/MapPage.tsx` | Store map ref, render search dropdown, fly-to on click, pass `highlightedPin` |

