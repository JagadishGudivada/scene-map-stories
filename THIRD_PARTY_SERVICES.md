# Sarevista — Third-Party Services, Keys & Billing Map

Audit date: 2026-08-07. Source of truth: code scan of `src/`, `supabase/functions/`, `scripts/`, `e2e/`.

Use this as the checklist when generating **production keys** so every paid or
rate-limited dependency has an owner, a dashboard, and a billing alert.

---

## 1. Billing-relevant services (money can be spent here)

| # | Service | Used for | Key / secret name | Where it runs | Billing model | Dashboard to monitor |
|---|---------|----------|-------------------|---------------|---------------|----------------------|
| 1 | **Lovable Cloud (Supabase)** — DB, Auth, Storage, Edge Functions | Everything: `titles`, `locations`, `spots`, `posts`, `profiles`, `affiliate_clicks`, avatars/covers/post-images buckets, all 15 edge functions | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEYS`, client-side `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Backend + client | Credits: compute instance size, egress, function invocations, storage GB | Lovable → Settings → Plans & credits (Cloud usage allowance: 40 credits/mo Free+Pro, 20 Business) |
| 2 | **Lovable AI Gateway** (Gemini/GPT via gateway) | AI enrichment + search in `search-titles`, `search-locations`, `title-details`, `location-details`, `spot-details`, `related-locations`, `reveal-cards`, `verify-location-suggestion` | `LOVABLE_API_KEY` (managed) · overridable: `AI_API_KEY`, `AI_CHAT_COMPLETIONS_URL`, `AI_MODEL`, `AI_MODEL_SEARCH` | Edge functions only | Per-token, deducted from credits after monthly AI allowance | Lovable → Settings → Plans & credits + AI Gateway request logs |
| 3 | **Google Cloud / Vertex AI** | Grounded enrichment + `passport-stamp-art` image generation | `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GCP_PROJECT_ID`, `GCP_LOCATION`, `VERTEX_MODEL_ENRICHMENT`, `VERTEX_MAX_OUTPUT_TOKENS`, `VERTEX_GROUNDING_ENABLED`, `VERTEX_TIMEOUT_MS` | Edge functions (`_shared/vertexCall.ts`, `_shared/vertexAuth.ts`) | Per-token + per-image + Grounding-with-Search per-query | GCP Console → Billing → Budgets & alerts (scope to the Vertex AI SKU) |
| 4 | **TMDB** (The Movie Database) | Title metadata, posters/backdrops, trailer keys | `TMDB_API_KEY` (also present as build-time `TMDB_API_KEY` in `.env`) | `weekly-movies`, `title-videos`, `search-titles`, `related-titles`, `_shared/images.ts` | Free tier, rate-limited; commercial use needs a paid/commercial agreement | themoviedb.org → API settings |
| 5 | **Pexels** | Fallback location/spot photography | `PEXELS_API_KEY` (backend), `VITE_PEXELS_API_KEY` (client, in bundle) | `location-photo`, `src/lib/pexels.ts` | Free, 200 req/hr + 20k/mo cap | pexels.com/api dashboard |
| 6 | **Mapbox** | Static map imagery fallback in `_shared/images.ts` | `MAPBOX_TOKEN` | Edge function | Free 50k static-image loads/mo, then per-1k | Mapbox account → Statistics + spend limit |
| 7 | **Google Maps Platform** | Referenced client-side; also `GEOCODING_API_KEY` for the accuracy pipeline (see `.env.example`) | `VITE_GOOGLE_MAPS_API_KEY` **and** `VITE_GOOGLE_MAP_API_KEY` (⚠ two spellings in code — unify), `GEOCODING_API_KEY` | Client + enrichment scripts | $200 free/mo then per-1k requests | GCP Console → Google Maps Platform → Metrics/Quotas |
| 8 | **Cloudflare Pages/Workers** | Hosting + deploy via `npx wrangler deploy`; `static.cloudflareinsights.com` analytics beacon; `challenges.cloudflare.com` (Turnstile) | Wrangler auth (`CLOUDFLARE_API_TOKEN` locally) | Hosting | Free tier generous; Workers requests billed beyond limits | Cloudflare dashboard → Workers & Pages → Usage |
| 9 | **Email provider** (declared in `.env.example`, not yet wired) | Transactional/auth email | `EMAIL_KEY`, `EMAIL_SERVER_NAME`, `EMAIL_USER_NAME`, `EMAIL_FROM`, `EMAIL_TO` | Backend (future) | Per-email after free tier | Provider dashboard |
| 10 | **Groq** (declared in `.env.example`, legacy/optional) | Alternate LLM path | `GROQ_API_KEY`, `GROQ_API_KEY_XAI`, `GEMINI_API_KEY` | Scripts | Per-token | Provider console |

> **Not billed but rate-limited / ToS-bound** (no key today, will break silently under load):
> OpenStreetMap **Nominatim** reverse geocoding (`PlanYourTripDialog`), **OSRM** demo router (`TrailMap` route geometry — demo server has no SLA, self-host or swap to a paid router before launch), **CARTO** basemap tiles, **ArcGIS Online** tiles, **Wikipedia / Wikidata**, **DuckDuckGo HTML**, **Open Library covers**, **DiceBear avatars**, **YouTube / youtube-nocookie** embeds, **Google Fonts**, **esm.sh** / **deno.land** (build-time).

---

## 2. Revenue side — affiliate partners

All outbound money links are built in `src/lib/affiliates.ts`. IDs are **public**
URL parameters, injected at build time via `VITE_AFF_*` env vars — they belong in
the build config, not the secrets store. Every click is logged to the
`affiliate_clicks` table by `src/lib/trackAffiliateClick.ts`, so our counts can be
reconciled against each partner dashboard.

| Partner | Service | Env var | Param format | Sign-up | Payout dashboard |
|---------|---------|---------|--------------|---------|------------------|
| Travelpayouts (Aviasales) | Flights | `VITE_AFF_TRAVELPAYOUTS` | `marker=XXXXXX` | travelpayouts.com | Travelpayouts → Statistics |
| Skyscanner Partners | Flights (fallback) | `VITE_AFF_SKYSCANNER` | `associateid=XXXX` | partners.skyscanner.net | Partner portal |
| Booking.com | Hotels | `VITE_AFF_BOOKING` | `aid=XXXXXXX` | booking.com/affiliate-program | Partner centre |
| GetYourGuide | Tours & tickets | `VITE_AFF_GETYOURGUIDE` | `partner_id=XXXXXX` | partner.getyourguide.com | Partner dashboard |
| Airalo | eSIM | `VITE_AFF_AIRALO` | `ref=XXXXXX` | airalo.com/partners | Partner dashboard |
| SafetyWing | Travel insurance | `VITE_AFF_SAFETYWING` | `referenceID=XXXXXX` | safetywing.com/affiliates | Affiliate dashboard |
| Google Maps directions | Directions | — | none | — | Not monetised (deep link only) |

With no ID configured, the flights card degrades to a plain Google Flights search —
functional for users, earning nothing. Verify attribution after deploy with
`e2e/plan-trip.spec.ts`.

---

## 3. Where each secret must be stored

| Storage location | What goes there | How |
|---|---|---|
| **Backend secrets** (edge functions) | `TMDB_API_KEY`, `PEXELS_API_KEY`, `MAPBOX_TOKEN`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GCP_*`, `LOVABLE_API_KEY`, AI tuning vars, `GEOCODING_API_KEY`, `EMAIL_*` | Lovable secrets store → available as `Deno.env.get()` |
| **Build/frontend env** (`VITE_*`, ships in the browser bundle — assume public) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_AFF_*`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_PEXELS_API_KEY` | Cloudflare Pages env vars / local `.env` |
| **Never in the repo or bundle** | `SUPABASE_SERVICE_ROLE_KEY`, DB password, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, any `*_SECRET` | Secrets store only |

Currently configured backend secrets: `GOOGLE_APPLICATION_CREDENTIALS_JSON`,
`LOVABLE_API_KEY`, `MAPBOX_TOKEN`, `PEXELS_API_KEY`, `TMDB_API_KEY`, plus the
Supabase-managed set.

---

## 4. Production key checklist

For each service in §1, before flipping to production:

1. Create a **separate production key** (never reuse the dev key) so usage graphs are attributable.
2. **Restrict it**: HTTP-referrer restriction for `VITE_*` browser keys (Google Maps, Pexels), IP/none for server keys, and least-privilege scopes for the GCP service account (Vertex AI User only).
3. Set a **hard spend cap or budget alert**: GCP budget alerts at 50/80/100%, Mapbox spend limit, Cloudflare notifications, Lovable credit limit (Settings → Workspace → member credit limits).
4. Record the key's **owner + rotation date** in the table below.
5. Add the key to the correct store per §3, redeploy edge functions so they pick it up, then smoke-test with `npx playwright test`.

### Key register (fill in during rollout)

| Service | Prod key created | Restricted to | Budget alert | Owner | Last rotated |
|---|---|---|---|---|---|
| Lovable Cloud | | | | | |
| Lovable AI Gateway | | | | | |
| Google Cloud / Vertex AI | | | | | |
| TMDB | | | | | |
| Pexels | | | | | |
| Mapbox | | | | | |
| Google Maps / Geocoding | | | | | |
| Cloudflare | | | | | |

---

## 5. Known issues to fix before generating prod keys

- **Duplicated Maps env var**: code reads both `VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAP_API_KEY`. Pick one name and update the call sites, otherwise one path silently runs unkeyed.
- **`.env` currently contains a live TMDB key committed in the working tree** — rotate it when you mint the production key.
- **`VITE_PEXELS_API_KEY` is exposed in the client bundle.** Route Pexels through the `location-photo` edge function instead, so the quota can't be scraped.
- **OSRM demo router + Nominatim have no commercial SLA.** Either self-host, or budget for a paid routing/geocoding provider before launch traffic.
- **Vertex AI issuer mismatch**: the Workload Identity pool must trust the current Supabase project issuer, or `passport-stamp-art` and the enrichment functions return `invalid_grant`.
- **Two Supabase project refs appear in code** (`gsdtkzjiaydkearsngxy` in `.env`, `vtblupfehbkrbnsdrrfq` in `supabase/config.toml`). Confirm which is production before pointing prod keys at either.
