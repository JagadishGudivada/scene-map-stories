# Project Context

This document is a compact knowledge reference for contributors and AI agents working in this repository. It explains what the project is, how it is structured, and which implementation patterns matter most.

## Product Summary

Scene Map Stories, branded in the UI as Sarevista, is a cinematic travel discovery app. It helps users explore real-world locations connected to movies, series, and books, save places they care about, and contribute community content.

The app combines three core experiences:

- Editorial discovery of titles and destinations.
- Map-driven exploration of filming and setting locations.
- User account flows for saving, posting, and profile activity.

## Core Stack

- Vite + React 18 + TypeScript for the frontend.
- React Router for page routing.
- Tailwind CSS plus shadcn and Radix UI primitives for UI.
- Framer Motion for transitions and cinematic interactions.
- Supabase for auth, data access, and Edge Functions.
- Vitest + Testing Library for tests.

## Design Intent

The visual language is documented in [BRANDING_GUIDELINES.md](./BRANDING_GUIDELINES.md).

Important design traits:

- Dark-first cinematic presentation.
- Amber and teal accents driven by CSS variables and semantic tokens.
- Glassmorphism surfaces and editorial typography.
- Responsive layouts that should work cleanly on mobile and desktop.

When changing UI, align with the existing branding system rather than introducing a separate look.

## Repository Shape

- `src/pages`: route-level screens.
- `src/components`: reusable UI and feature components.
- `src/components/ui`: shadcn-style primitives and wrappers.
- `src/hooks`: reusable client-side state, async, and integration logic.
- `src/lib`: shared utilities, mock data, caching helpers, and app-level helpers.
- `src/integrations/supabase`: browser-side Supabase client and generated types.
- `supabase/functions`: Edge Functions used for AI-backed search and detail flows.
- `supabase/functions/_shared`: shared Edge Function helpers.
- `src/test`: Vitest setup.

## Frontend Architecture

The frontend is assembled in `src/App.tsx` around a few persistent providers:

- React Query provider for server and async state.
- Auth provider for session and user access.
- Theme provider.
- Router and shared navigation.

Current route structure centers on:

- Home and explore flows.
- Title, location, and filming spot detail pages.
- Map exploration.
- Auth, profile, and add-title flows.
- Static company and policy pages.

Patterns already established in the app:

- Keep route paths and slugs lowercase and kebab-cased.
- Use `ProtectedRoute` for auth-gated routes.
- Use shared hooks for reusable async logic rather than duplicating behavior in pages.
- Use the shared `Seo` component for public-facing page metadata.
- Prefer the `@/` import alias for app code.

## Data And Integration Model

Supabase powers both browser-side data access and server-side enrichment flows.

Browser-side patterns:

- App code uses the existing Supabase client under `src/integrations/supabase`.
- Auth state is managed through the auth hook and provider.
- Pages and hooks fetch data directly or via shared helpers.

Server-side patterns:

- Edge Functions handle AI-assisted search and detail retrieval.
- Shared helpers in `supabase/functions/_shared` should be reused before creating duplicate logic.
- Functions typically validate input early, handle CORS explicitly, and return JSON responses with clear status codes.

## AI Notes

The project uses AI-backed endpoints for title, location, and spot discovery/details.

Relevant implementation themes:

- Search hooks debounce user input before invoking AI-backed endpoints.
- Edge Functions distinguish common provider failures such as rate limits and credit exhaustion.



## Important Working Conventions

- Reuse existing UI primitives and utilities before introducing parallel abstractions.
- Prefer semantic Tailwind and CSS variable tokens over hard-coded colors.
- Put reusable client-side async behavior in hooks.
- Keep Edge Function contracts aligned with the frontend callers that consume them.
- Keep changes focused; do not refactor unrelated areas without a task-driven reason.

## Common Commands

- `npm run dev`: start the Vite dev server.
- `npm run build`: production build.
- `npm run lint`: ESLint check.
- `npm run test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode.

## Current Caveats

- The repository currently has an existing ESLint backlog, especially around `no-explicit-any`, a few empty-interface errors, and some React hook dependency warnings.
- Existing docs are intentionally split: branding guidance lives in [BRANDING_GUIDELINES.md](./BRANDING_GUIDELINES.md), while the data migration direction lives in [plan.md](./.lovable/plan.md).

## Recommended Context Files

When working on this repo, these are the highest-value reference files to read first:

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
- [BRANDING_GUIDELINES.md](./BRANDING_GUIDELINES.md)
- [.github/copilot-instructions.md](./.github/copilot-instructions.md)
- [.github/instructions/app-frontend.instructions.md](./.github/instructions/app-frontend.instructions.md)
- [.github/instructions/supabase-edge-functions.instructions.md](./.github/instructions/supabase-edge-functions.instructions.md)

