# Project Context

This document is a compact knowledge reference for contributors and AI agents working in this repository. It explains what the project is, how it is structured, and which implementation patterns matter most.

## Product Summary

Sarevista (formerly called Scene Map Stories) is a cinematic travel discovery app. It turns on-screen stories into real-world travel destinations: users explore filming and setting locations from movies, series, and books, save places they have visited, follow trails, and share their journeys.

The app combines four core experiences:

- Editorial discovery of titles, locations, and destinations.
- Map-driven exploration of filming and setting locations, with city-level clustering and suggested trails.
- Social/profile flows: saving spots, a public passport, gamification, Memory Lane, and shareable journey cards.
- Monetised travel planning: the "Plan Your Trip" dialog routes users to affiliate partners (hotels, tours, flights, eSIMs) while logging clicks for attribution.

Primary positioning: "Not a list. Your memory map."

## Core Stack

- Vite + React 18 + TypeScript for the frontend.
- React Router for page routing.
- Tailwind CSS plus shadcn and Radix UI primitives for UI.
- Framer Motion for transitions and cinematic interactions.
- Supabase (Lovable Cloud) for auth, data, Edge Functions, and storage.
- MapLibre GL for map rendering; Leaflet/CARTO tiles are used in some legacy map components.
- React Query for async/server state.
- Vitest + Testing Library for unit tests.
- Playwright for end-to-end smoke tests.
- Cloudflare Workers / Wrangler for production deployment (static-assets Worker with SPA fallback).

## Design Intent

The visual language is documented in [BRANDING_GUIDELINES.md](./BRANDING_GUIDELINES.md).

Important design traits:

- Dark-first cinematic presentation (AMOLED black, charcoal glass).
- Amber and teal accents driven by CSS variables and semantic tokens.
- Instrument Serif for headings, Inter for body, JetBrains Mono for data/tech details.
- Glassmorphism surfaces, premium bento grids, subtle grain, and shimmer-sweep buttons.
- Responsive layouts that work cleanly on mobile and desktop; mobile often hides secondary metadata to keep cards glanceable.
- IMDb-inspired information density on desktop; hamburger drawer navigation on mobile.

When changing UI, align with the existing branding system rather than introducing a separate look.

## Repository Shape

- `src/pages`: route-level screens.
- `src/components`: reusable UI and feature components.
- `src/components/ui`: shadcn-style primitives and wrappers.
- `src/components/profile`: profile-specific gamification and map components.
- `src/components/map`: map-specific components (markers, vignettes, panels, trail map).
- `src/hooks`: reusable client-side state, async, and integration logic.
- `src/lib`: shared utilities, mock data, caching helpers, SEO helpers, and app-level helpers.
- `src/integrations/supabase`: browser-side Supabase client and generated types.
- `supabase/functions`: Edge Functions used for AI-backed search, detail retrieval, enrichment, sitemap, and verification.
- `supabase/functions/_shared`: shared Edge Function helpers.
- `src/test`: Vitest setup.
- `e2e/`: Playwright smoke tests and helpers.
- `scripts/`: build-time utilities (sitemap generation, edge-function checks, data-quality scans).

## Frontend Architecture

The frontend is assembled in `src/App.tsx` around a few persistent providers:

- React Query provider for server and async state.
- Auth provider for session and user access.
- Theme provider.
- Tooltip provider and toast/sonner notifications.
- Router and shared navigation.

Current route structure includes:

- `/` — Home landing page.
- `/explore` — Discovery/search hub.
- `/title/:slug` — Title detail (movies, series, books). Slugs are kebab-cased and suffixed with media type (e.g., `-movie`, `-series`, `-book`).
- `/location/:slug` — Location/city detail.
- `/location/:slug/filming-spots` — Filming spots list for a location.
- `/spot/:slug` — Individual filming spot detail.
- `/map` — Map exploration page.
- `/trails/:id` — Trail/tour detail page with clustered stops and OSRM route geometry.
- `/scene-mode/:slug` — Split-screen scene-vs-real comparison.
- `/u/:username` — Private profile (authenticated).
- `/passport/:username` — Public passport profile.
- `/add` — Add a title (protected).
- `/auth` and `/reset-password` — Auth flows.
- Footer/company pages: `/about`, `/our-story`, `/careers`, `/press`, `/contact`, `/guides`, `/destinations`, `/community`, `/help`, `/safety`, `/cancellation`, `/report`, `/accessibility`, `/terms`, `/privacy`, `/cookies`, `/affiliate-disclosure`, `/sitemap`.
- `*` — Not found.

Patterns already established in the app:

- Keep route paths and slugs lowercase and kebab-cased.
- Use `ProtectedRoute` for auth-gated routes.
- Use shared hooks for reusable async logic rather than duplicating behavior in pages.
- Use the shared `Seo` component and `src/lib/seoSchema.ts` helpers for public-facing page metadata and JSON-LD structured data.
- Use `BreadcrumbList` and `ItemList` structured data on detail pages for SEO.
- Prefer the `@/` import alias for app code.
- Use semantic Tailwind tokens and CSS variables; avoid hard-coded colors to preserve dark/light theme support.

## Data And Integration Model

Supabase powers both browser-side data access and server-side enrichment flows.

Browser-side patterns:

- App code uses the existing Supabase client under `src/integrations/supabase`.
- Auth state is managed through the `useAuth` hook and provider.
- Pages and hooks fetch data directly or via shared helpers.
- Affiliate click tracking is logged via `src/lib/trackAffiliateClick.ts` into the `affiliate_clicks` table.

Server-side patterns:

- Edge Functions handle AI-assisted search, title/location/spot detail retrieval, related content, enrichment, sitemap generation, and video/trailer lookups.
- Shared helpers in `supabase/functions/_shared` should be reused before creating duplicate logic.
- Functions typically validate input early, handle CORS explicitly, and return JSON responses with clear status codes.
- Row-level security (RLS) and explicit `GRANT`s are required on every public table; the `has_role()` security-definer helper is used for role checks but is locked down to `service_role` only.

## AI Notes

The project uses AI-backed endpoints for title, location, and spot discovery/details.

Relevant implementation themes:

- Search hooks debounce user input before invoking AI-backed endpoints.
- Edge Functions distinguish common provider failures such as rate limits and credit exhaustion.
- Vertex AI Workload Identity Federation must trust the current Supabase project issuer for enrichment functions to authenticate.

## Important Working Conventions

- Reuse existing UI primitives and utilities before introducing parallel abstractions.
- Prefer semantic Tailwind and CSS variable tokens over hard-coded colors.
- Put reusable client-side async behavior in hooks.
- Keep Edge Function contracts aligned with the frontend callers that consume them.
- Keep changes focused; do not refactor unrelated areas without a task-driven reason.
- Affiliate IDs are public query-string parameters; partner-specific IDs are stored in `src/lib/affiliates.ts` and can be overridden by environment variables (`VITE_AFF_*`).
- Server-side secrets (API keys, service-role keys) are never committed or logged; they are managed through Lovable Cloud secrets.

## Common Commands

- `npm run dev`: start the Vite dev server.
- `npm run build`: production build.
- `npm run lint`: ESLint check.
- `npm run test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run e2e`: run Playwright smoke tests once.
- `npm run e2e:ui`: run Playwright tests in interactive UI mode.
- `npm run e2e:install`: install Playwright Chromium browser.
- `npm run check:edge`: validate deployed Edge Functions.
- `npm run data-quality-scan`: run data-quality checks.

## Deployment

Production deploys are done from the local machine via Wrangler:

1. `npm run build`.
2. `npx wrangler deploy --env production` (or the appropriate Wrangler environment).
3. Verify SPA fallback, deep links, and affiliate link attribution.

The `wrangler.toml` file is already configured as a static-assets Worker with SPA fallback. See [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) for the full checklist and environment-variable list.

## Current Caveats

- The repository currently has an existing ESLint backlog, especially around `no-explicit-any`, a few empty-interface errors, and some React hook dependency warnings.
- Existing docs are intentionally split: branding guidance lives in [BRANDING_GUIDELINES.md](./BRANDING_GUIDELINES.md), launch and monetisation guidance lives in the archived plan under `.lovable/plan/`, and this file is the day-to-day project reference.
- TMDB/YouTube keys and partner affiliate IDs are environment-dependent; local development may fall back to placeholder or degraded behavior when those keys are absent.

## Recommended Context Files

When working on this repo, these are the highest-value reference files to read first:

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
- [BRANDING_GUIDELINES.md](./BRANDING_GUIDELINES.md)
- [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md)
- [e2e/README.md](./e2e/README.md)
- [.github/copilot-instructions.md](./.github/copilot-instructions.md)
- [.github/instructions/app-frontend.instructions.md](./.github/instructions/app-frontend.instructions.md)
- [.github/instructions/supabase-edge-functions.instructions.md](./.github/instructions/supabase-edge-functions.instructions.md)
