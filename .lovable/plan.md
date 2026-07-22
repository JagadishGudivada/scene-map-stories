
# Beating CineMapper — Positioning & Product Plan

## What CineMapper is (from Semrush + their site)

- **Traffic**: ~2.5K/mo US mobile, ~1.8K UK — small but ranking #1 for "filming locations".
- **Product**: A single global filming-location **map**, a **Film/TV browser**, and **CineTrails** (same trail idea we just shipped). Community submissions, socials, cookie banner. Feels like a hobbyist Firebase app.
- **Weakness signals**: loading screen quote gimmick, no personal layer (no passport/journey/profile), no books, no AI, generic SEO ("filming locations" homepage does 57% of their traffic — one-page-carries-the-site).
- **Category competitors** (from Semrush): findthatlocation.com (2.5K/mo, biggest), lafilmlocations.com, filmingmap.com, wearedorothy.com. All are **directories**. None own the "personal journey" angle.

## The core insight

CineMapper (and every competitor) is a **directory** — "here are places from movies". Sarevista's memory already lives in `mem://index.md`: **"Not a list. Your memory map."** That's the wedge. We don't beat CineMapper by having more pins; we beat them by being the only product where **watching → visiting → remembering** is one continuous loop.

Three moats we can build that they structurally can't copy without a rewrite:

1. **Personal layer** — Passport, Fog-of-War, Tier badges, Memory Lane, milestones. Already shipped. Double down.
2. **AI-native discovery** — Gemini scout, Film Concierge, AI location search. Already in the codebase. They have none.
3. **Beyond film** — Books + series + movies with `tmdb_id`, trailers next. "Screen + page locations", not just filming.

## Plan (phased, ~4 workstreams)

### 1. Sharpen positioning on the landing page

Reframe hero + meta so a first-time visitor immediately sees we're **not** another filming-locations directory.

- Hero H1 stays but sub-hero adds a comparison line: *"Directories show you pins. Sarevista remembers where you've been."*
- Add a small "Why Sarevista" strip below `HowItWorks` with 3 tiles: **Your passport, not a directory** · **AI concierge, not a search box** · **Books, series & film — one map**.
- Update `<title>`/meta description + `llms.txt` around "screen-location memory map" — stop competing head-on for "filming locations" (CineMapper owns it), win the long tail: "where was <title> filmed", "<title> filming locations map", "<city> filming locations trail".

### 2. SEO — attack the long tail, not the head term

CineMapper's #1 keyword ("filming locations") is a fortress. Their #2–4 are per-title pages (`/film/percyjacksonolympians`, `/cinetrails/andor-uk`, `/page/tenet`) — that's where the real, winnable traffic is.

- Ensure every `/title/:slug` page has: title-specific H1, filming-location count, city list, JSON-LD `Movie`/`TVSeries`, and internal links to trail + spots.
- Ensure every `/trails/:id` page has: city-in-title H1 ("London walking trail through 8 filming locations"), OG image, structured data.
- Generate a `/filming-locations/:city` index page (pulls from `locations` table) for city-level SEO — CineMapper has nothing here.
- Regenerate `sitemap.xml` to include all titles, trails, and city pages.

### 3. Feature moves that widen the gap

Ship the things CineMapper can't fast-follow because their data model doesn't support it:

- **Trailers on title pages** (TMDB videos endpoint — `tmdb_id` already stored).
- **Books as a first-class type** — already partially wired via the `-book` slug suffix. Add a book icon in filters and a "From the page to the place" section on the landing page.
- **Shareable stop card** — already built; add a one-tap "Add to Instagram Story" flow post-check-in. This is the viral loop CineMapper lacks entirely.
- **"I've been here" check-in** on every spot page, feeding Fog-of-War + Passport. Currently the loop starts at Profile; move the entry point onto the spot page.

### 4. Community + defensibility

CineMapper accepts user submissions but has no profile/social layer. Ours does.

- Enable **public passport pages** (`/u/:username`) to be shared — every share is a backlink and a signup funnel.
- Add a **"Contributed by @user"** attribution on locations users add via `AddLocationDialog`, with a link to their passport. Turns contributors into promoters.
- Weekly **"Trail of the week"** email (transactional infra already exists) featuring one user's public passport route.

## Technical notes

- No schema changes needed for phase 1–2. Phase 3 needs a `spot_checkins` table (user_id, spot_id, visited_at) with RLS, GRANTs to `authenticated`, and a `has_visited(spot, user)` helper — feeds Fog-of-War directly.
- Trailers: extend `title-details` edge function to also call `/movie/{id}/videos` + `/tv/{id}/videos`; cache in `titles.data->videos`.
- City index pages: new route `/filming-locations/:citySlug`, powered by a Supabase view grouping `locations` by kebab city key (same key `useTrails` already uses).
- SEO/JSON-LD lives in the existing `Seo.tsx` component — extend it with a `structuredData` prop.

## What we are *not* doing

- Not competing for "filming locations" as a head term — too expensive vs. CineMapper's existing rank + backlink profile.
- Not adding more pins for the sake of pin count. Directory arms races are a losing game.
- Not copying CineTrails naming or layout — ours (`Trails & Tours`) already differentiates on walking vs. one-day drive.

## Suggested execution order

1. Positioning + meta + "Why Sarevista" strip (small, high leverage).
2. Title page SEO polish + JSON-LD + sitemap regeneration.
3. City index pages.
4. Trailers on title pages.
5. Check-ins + public passport share loop.
