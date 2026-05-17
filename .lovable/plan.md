## Goal
Replace the ephemeral `ai_cache` (JSON blobs with TTL) with **first-class, queryable tables** for titles, locations, and spots. Fetch from AI/TMDB/Wikipedia **once**, persist forever, and allow user-reported corrections.

## Why move off `ai_cache`
- Payloads expire (30d TTL) → repeat AI cost on cache miss.
- Opaque JSON → can't query, join, filter, or rank.
- No way to correct a single field — whole row is overwritten on refresh.
- No provenance, no versioning, no moderation path for reports.

---

## New tables

### 1. `titles`
Canonical record for every Movie / Series / Book.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text UNIQUE | e.g. `project-hail-mary-2026` |
| `tmdb_id` | int | nullable, indexed |
| `imdb_id` | text | nullable |
| `type` | enum (`Movie`,`Series`,`Book`) | |
| `title` | text | |
| `year` | int | |
| `synopsis` | text | |
| `genres` | text[] | |
| `rating` | numeric | |
| `poster_url` | text | TMDB w500 |
| `backdrop_url` | text | TMDB w1280 |
| `data` | jsonb | extra fields (cast, runtime, etc.) |
| `source` | text | `tmdb` / `openlibrary` / `ai` |
| `verified` | boolean | manual override flag |
| `last_fetched_at` | timestamptz | |
| `created_at`, `updated_at` | timestamptz | |

### 2. `locations`
City / region pages (e.g. "Dorset, UK", "Reykjavík").

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text UNIQUE | |
| `name`, `city`, `country`, `flag` | text | |
| `lat`, `lng` | double precision | |
| `hero_image_url` | text | Wikipedia/Wikidata resolved |
| `description` | text | |
| `data` | jsonb | city intel, tips, etc. |
| `source`, `verified`, `last_fetched_at`, timestamps | | |

### 3. `spots`
Exact filming/setting spots (e.g. "Durdle Door").

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text UNIQUE | |
| `name`, `address`, `city`, `country`, `flag` | text | |
| `lat`, `lng` | double precision | indexed (PostGIS-style btree on both) |
| `image_url` | text | Wikidata-by-coords or Mapbox static |
| `description` | text | |
| `fun_facts`, `visit_tips` | text[] | |
| `data` | jsonb | |
| `source`, `verified`, `last_fetched_at`, timestamps | | |

### 4. `title_spots` (join)
| `title_id` → titles.id | `spot_id` → spots.id | `role` (`filming`/`setting`) | UNIQUE(title_id, spot_id) |

### 5. `data_reports` (user corrections)
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | reporter |
| `entity_type` | enum (`title`,`location`,`spot`) | |
| `entity_id` | uuid | |
| `field` | text | e.g. `image_url`, `lat`, `description` |
| `current_value` | text | snapshot |
| `suggested_value` | text | |
| `reason` | text | |
| `status` | enum (`pending`,`accepted`,`rejected`) | default pending |
| `resolved_by`, `resolved_at` | | |
| timestamps | | |

---

## Images: store URLs, not files

**Recommendation: store URLs only.** Reasons:
- TMDB & Wikimedia URLs are stable, CDN-backed, free, and already optimized.
- Mapbox static URLs are deterministic from lat/lng — no need to persist bytes.
- Storing files = ~200KB–2MB per record × thousands of rows → storage cost + bandwidth + cache invalidation complexity.
- **Exception**: if a user uploads their own photo (future feature), THEN use Supabase Storage with a `user_photos` bucket.

Add a lightweight **image health check** (optional, later): cron edge function pings `image_url` weekly; on 404 it triggers re-resolution via existing `_shared/images.ts`.

---

## Edge function changes

Each detail function becomes **read-through cache** against the new tables:

```
spot-details(slug)
  → SELECT from spots WHERE slug=$1
     ├── found & fresh (last_fetched_at < 90d) → return row
     └── miss/stale → call AI + resolveLocationImage → UPSERT → return
```

Same for `title-details` (against `titles`) and `location-details` (against `locations`).

`ai_cache` rows for these three function_names become redundant and can be dropped after migration.

---

## Report flow (UI)

- Add small "Report incorrect info" button on TitleDetail / LocationDetail / FilmingSpotDetail pages.
- Dialog: choose field → enter correction → submit.
- Inserts row into `data_reports`. Admin reviews → on accept, updates the canonical row + sets `verified=true`.

(Admin moderation UI is out of scope for this plan — initial version just collects reports.)

---

## RLS

- `titles`, `locations`, `spots`: **public SELECT**, no public write (writes happen via edge functions using service role).
- `title_spots`: public SELECT.
- `data_reports`: authenticated users INSERT their own; SELECT own; admin role can SELECT/UPDATE all (uses `user_roles` + `has_role` pattern).

---

## Migration plan

1. Create the 5 tables + enums + indexes + RLS.
2. Create `user_roles` + `has_role` (needed for admin moderation).
3. Update 4 edge functions (`title-details`, `location-details`, `spot-details`, `related-locations`) to read-through the new tables.
4. Backfill: one-shot script reads existing `ai_cache` rows and UPSERTs into the new tables.
5. Update `useRecentTitleDetails` / `useRecentVisitedSpots` to query `titles` / `spots` directly (cleaner, faster than parsing `ai_cache.payload`).
6. Add `ReportInfoDialog` component + wire into the three detail pages.
7. After verification, drop `ai_cache` rows for `title-details`/`location-details`/`spot-details` (keep table for other AI calls).

---

## Out of scope (future)
- Admin moderation dashboard.
- User-uploaded photos → Supabase Storage bucket.
- Image health-check cron.
- Full-text search across titles/spots.
