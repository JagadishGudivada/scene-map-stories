## Goal
Pages that depend on AI edge functions (`title-details`, `spot-details`, `search-titles`, `search-locations`, `location-details`) feel slow because every navigation triggers a fresh 3–15s AI call. Make perceived load feel near-instant.

## Strategy (4 layers)

### 1. Server-side caching in the database (biggest win)
Add a `ai_cache` table keyed by `(function_name, cache_key)` storing the JSON response + `expires_at`. Each edge function:
- Computes a deterministic key (e.g. `title-details:<slug>`).
- Returns cached row immediately if fresh (TTL: title-details 30 days, spot-details 30 days, location-details 30 days, search-titles 24h, search-locations 24h).
- Otherwise calls AI, stores result, returns it.

Result: second visit to any title/spot/location is ~50–150ms instead of 5–15s. First visitor warms the cache for everyone.

### 2. Switch to faster/cheaper models per route
Right now everything uses `google/gemini-3-flash-preview` plus Google grounding (slow). Tune per use case:
- `search-titles`, `search-locations` → `google/gemini-3.1-flash-lite-preview`, grounding **off** by default (autocomplete must be snappy).
- `title-details`, `spot-details`, `location-details` → keep `gemini-3-flash-preview` but `reasoning_effort: "minimal"` and grounding only on cache miss.
- Reduce `AI_TIMEOUT_MS` so we fail fast and fall back.

### 3. Client-side caching + prefetch
- Wrap every `supabase.functions.invoke(...)` for AI routes in a `sessionStorage` + in-memory `Map` cache (per-tab). Subsequent navigation in the same session = 0ms.
- On hover/focus of a title card or search result, **prefetch** `title-details` so by the time the user clicks, data is ready.
- Persist `title-details` / `spot-details` results in `localStorage` with TTL (e.g. 7 days) so returning users skip the call entirely.

### 4. Progressive rendering (perceived speed)
- `TitleDetail` currently shows a blank loader until the full AI payload arrives. Render the page shell (hero, title, type, year from `navState`/slug) immediately, then stream in synopsis, locations, and cover image as they arrive.
- Add real skeletons (using `src/components/ui/skeleton.tsx`) for the synopsis, location list, and map rather than a single spinner.
- Optional stretch: convert `title-details` to SSE streaming so synopsis text appears token-by-token.

## Files touched

**New**
- `supabase/migrations/<ts>_ai_cache.sql` — `ai_cache` table + index on `(function_name, cache_key)` + RLS (service role only writes; public read via edge function only, so no public policy needed).
- `supabase/functions/_shared/aiCache.ts` — `getCached(fn, key)` / `setCached(fn, key, value, ttlSeconds)` helpers using service role client.
- `src/lib/aiClientCache.ts` — typed wrapper around `supabase.functions.invoke` with memory + sessionStorage + optional localStorage TTL.

**Edited**
- `supabase/functions/title-details/index.ts` — cache by slug, lower reasoning, faster timeout.
- `supabase/functions/spot-details/index.ts` — cache by slug.
- `supabase/functions/location-details/index.ts` — cache by slug.
- `supabase/functions/search-titles/index.ts` — cache by normalized query (24h), switch to flash-lite, grounding off.
- `supabase/functions/search-locations/index.ts` — same treatment as search-titles.
- `src/hooks/useAITitleSearch.tsx`, `src/hooks/useAILocationSearch.tsx` — use client cache, drop debounce from 700ms → 350ms (cache makes repeat keystrokes free).
- `src/pages/TitleDetail.tsx` — render shell first, skeletons for sub-sections, use client cache, add hover prefetch hook export.
- `src/pages/FilmingSpotDetail.tsx`, `src/pages/LocationDetail.tsx` — same shell-first treatment + client cache.
- `src/components/CinemaCard.tsx` (and search result rows) — `onMouseEnter` triggers prefetch.

## Expected impact
- First-ever visit to a title page: ~5–8s (one AI call, minimal reasoning) vs ~10–15s today.
- Repeat visits by anyone: <200ms (DB cache hit).
- Repeat visits in same browser: instant (memory/session cache).
- Search dropdown: feels instant after first few queries are cached.

## Out of scope (can do later)
- Replacing Wikipedia image fetch in `title-details`/`spot-details` with a faster cached image lookup.
- Edge function streaming (SSE) for synopsis — only if perceived speed still feels slow after the above.
- Background regeneration of stale cache entries (stale-while-revalidate).
