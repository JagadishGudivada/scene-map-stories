## Goal
Replace the current "best-effort Wikipedia + Unsplash random" image strategy with deterministic, source-of-truth images for both **titles** (movies/series/books) and **locations** (cities, filming spots).

## Current problems
- **Titles**: `title-details`, `related-titles`, `location-details` use a Wikipedia search → first result. Often wrong (returns disambiguation pages, generic articles, or unrelated movies with the same name). Falls back to `source.unsplash.com` which is **deprecated** and returns broken/random images.
- **Locations / spots**: Same Wikipedia-first approach. For a "filming spot" like "Stairs of Joker", Wikipedia rarely has the exact image; Unsplash returns random street photos.

## Strategy

### Titles → TMDB (authoritative)
TMDB is already in use (`related-titles`, `TMDB_API_KEY` in env). Make it the **single source** for movie/series posters and backdrops:
1. `GET /search/movie` (or `/search/tv`) with `query`, `year`, `include_adult=false`.
2. Pick the result with highest `popularity` + matching year (±1).
3. Use `poster_path` (w500) for cover, `backdrop_path` (w1280) for hero.
4. For **books**, fall back to **Open Library Covers API** (`https://covers.openlibrary.org/b/title/<title>-L.jpg` after `/search.json` lookup by title+author).

### Locations & spots → Wikimedia + Wikidata (precise) → Mapbox Static fallback
1. **Wikipedia REST `/page/summary/{exact title}`** first — but only when we can resolve the *exact* page title. Use `action=opensearch` to confirm the top hit's title contains the spot/city name as a token; if not, skip.
2. Use **Wikidata SPARQL** by coordinates for famous landmarks: query for items within ~50m of (lat,lng) with a P18 (image) property; pull the Commons file URL via `Special:FilePath`.
3. For cities: use the country/city Wikipedia page summary (very reliable for cityscapes).
4. **Final fallback**: **Mapbox Static Images API** centered on (lat,lng) — guaranteed to show the actual place from satellite/street view tiles. Requires `MAPBOX_TOKEN` (free tier sufficient). If user doesn't want to add it, fall back to OpenStreetMap static via `staticmap.openstreetmap.de`.

### Cache invalidation
Bump cache by changing the `cache_key` prefix (e.g. add `v2:` prefix) so existing wrong images get re-fetched. Old entries expire naturally.

## Implementation

### New shared helpers — `supabase/functions/_shared/images.ts`
- `getTmdbImage(title, year, type)` → `{ poster, backdrop }` or `null`
- `getOpenLibraryCover(title, author?)` → url or `null`
- `getWikipediaImageStrict(exactTitle)` — only returns if opensearch confirms exact match
- `getWikidataImageByCoords(lat, lng, radiusKm)` → url or `null`
- `getStaticMapImage(lat, lng, zoom)` → Mapbox or OSM URL (always succeeds)
- `resolveTitleImage({title, year, type, author?})` — orchestrates: TMDB → OpenLibrary → strict Wikipedia → null
- `resolveLocationImage({name, city, country, lat, lng, kind})` — orchestrates: strict Wikipedia → Wikidata-by-coords → static map

### Edge functions to update
1. `title-details/index.ts` — replace `fetchWikipediaImage` with `resolveTitleImage`. Add `posterImage` and `backdropImage` fields.
2. `related-titles/index.ts` — already uses TMDB; add stricter year-match scoring (no change to image source).
3. `location-details/index.ts` — replace title image enrichment with `resolveTitleImage`; replace city hero with `resolveLocationImage` using returned lat/lng.
4. `spot-details/index.ts` — replace Wikipedia/Unsplash block with `resolveLocationImage` (will hit Wikidata by coords for famous spots, static map otherwise).
5. `related-locations/index.ts` — switch any city image logic to the same helper.

### Frontend
No type changes needed — fields (`coverImage`, `image`, `heroImage`) stay the same. The `TitleDetail.tsx` / `LocationDetail.tsx` pages already render these. Optional polish: lazy-load + skeleton on image error.

### Secrets
Need to ask user for **`MAPBOX_TOKEN`** (free, 50k/month) for the static map fallback. Without it, OSM static map fallback works but is lower quality.

## Technical Notes
- All requests run server-side in edge functions; respect 5–10s budget per call by running image lookups in `Promise.allSettled` with `AbortSignal.timeout(4000)`.
- Cache key bump: prepend `"v2:"` to slug/key in `getCached`/`setCached` calls so we re-fetch with the new logic without manual DB cleanup.
- TMDB rate limit (~50 req/s) is fine for our volume.
