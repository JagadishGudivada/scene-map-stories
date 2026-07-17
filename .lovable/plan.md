
## Problem

1. **Type isn't part of a title's identity.** `slugifyTitle()` builds slugs as `title-year` only. A movie and a series with the same name/year collide on the same slug, so whichever was stored in `titles` first is served for every subsequent visit — regardless of what the user picked in the search bar. The `type` we currently pass via `navigate(..., { state })` only survives one hop; on a hard refresh or a shared link the slug alone drives the DB read in `title-details` and the wrong row wins.
2. **TMDB id is discarded.** `search-titles` already hits TMDB multi-search and has `r.id` in hand, but strips it before returning. The `titles.tmdb_id` column exists but is almost always null, which blocks the upcoming trailers feature (`/movie/{id}/videos`, `/tv/{id}/videos`).

## Fix

### 1. Make `type` part of the slug

Change `slugifyTitle(title, year, type)` to append a type suffix: `inception-2010-movie`, `sherlock-2010-series`, `dune-2021-book`. Update the parser in `title-details` to read type from the slug (fallback: hint, then Movie). This guarantees the DB lookup key is unique per media type and survives refresh/share.

Touch points:
- `src/hooks/useAITitleSearch.tsx` — new signature.
- `src/components/Navigation.tsx`, `src/pages/Index.tsx` — pass `t.type` when building the link.
- `src/pages/TitleDetail.tsx` — parse type from slug for the DB read and the `title-details` call; keep navState as a hint.
- `src/hooks/useRecentTitleDetails.ts`, `useWeeklyCurrentYearTitles`, `useWeeklyReleaseLocations`, `useConsolidatedMapPins`, `useRecentVisitedSpots`, `TrendingRow`, `Profile` — anywhere `slugifyTitle` is called or a link to `/title/:slug` is generated, include type.
- `supabase/functions/title-details/index.ts` — accept optional `type` in body (already does); when slug ends with `-movie|-series|-book`, use that as the source of truth and pass to `upsertTitle`.
- `supabase/functions/_shared/store.ts` — no change; already stores `type`.

Existing rows keyed by old slugs stay readable but new writes go to type-suffixed slugs. Old bookmarked URLs without a type suffix keep working via a fallback branch that treats the slug as legacy and defaults to Movie (or the hint from navState).

### 2. Return + persist `tmdb_id`

- `supabase/functions/search-titles/index.ts` — include `tmdb_id: r.id` (and `media_type`) on each `TitleOut` from `tmdbMultiSearch`. The AI branch keeps `tmdb_id` undefined; that's fine.
- `src/hooks/useAITitleSearch.tsx` — expose `tmdb_id?: number` on `TitleResult`.
- `Navigation.tsx` / `Index.tsx` search result click — include `tmdb_id` in `navigate` state.
- `src/pages/TitleDetail.tsx` — forward `tmdb_id` in the `title-details` request body.
- `supabase/functions/title-details/index.ts` — pass `tmdb_id` into the `upsertTitle` payload so `titles.tmdb_id` is populated on cold-path writes.
- When the incoming request has a `tmdb_id` but the AI response omits it, inject it into the parsed payload before upsert.

No schema changes: `tmdb_id integer` already exists on `public.titles`.

### 3. Out of scope for this change

Trailer fetching itself. This plan only unblocks it by ensuring `tmdb_id` is stored and typed correctly. The next feature can call TMDB `/movie/{tmdb_id}/videos` or `/tv/{tmdb_id}/videos` directly.

## Verification

- Click a Series from the search bar whose title matches a Movie → detail page loads Series data, DB row keyed by `-series` slug.
- Refresh the Series page → still Series (type comes from slug, not navState).
- Query `select slug, type, tmdb_id from titles order by created_at desc limit 5` after a fresh search → `tmdb_id` populated for TMDB-backed results.
- Old `/title/inception-2010` URLs still resolve (legacy fallback).
