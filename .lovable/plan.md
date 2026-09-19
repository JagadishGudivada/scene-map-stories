# Code Health Refactor — Sequential Action Plan

Fixes are grouped so each group is independently shippable and verifiable. No visual or behavioural change is intended anywhere except where stated.

## Group 1 — Safety net and dead weight (low risk)

1. Add an error boundary around the routed area so a crash in one page shows a recoverable "something went wrong" panel instead of a blank screen, with a reset button.
2. Delete `src/App.css` (never imported) and `src/components/MapSidePanel.tsx` (superseded by the map detail panel).
3. Fix the unmount leak in the two AI search hooks: clear the pending debounce timer and ignore late responses after teardown.
4. Replace the `as any` cast in the static-page route with a correct readonly-aware prop type.

## Group 2 — Data loading brought up to standard (medium risk)

5. Move profile data loading off hand-rolled effects onto the query layer that is already installed: one query per concern (profile, visited spots, saved lists, posts), with proper loading and error states instead of silent `console.error`.
6. Do the same for the title and location detail pages, so repeated visits hit cache rather than refetching.
7. Type the edge-function payloads once, in a shared types module, and use those types at every call site to remove the bulk of the `any` usage.
8. Harden the AI cache helper: don't cache rejected work, and let a failed call be retried by the next caller.

## Group 3 — Breaking up the largest screens (medium risk, mechanical)

9. Split the location detail page into presentational sections (hero, intel, spots, nearby, trails, FAQ) with data supplied by the queries from Group 2.
10. Split the title detail page the same way.
11. Split the profile page into its tab panels.
12. Remove the lint suppression in the fog-of-war map by giving the calculation correct inputs.

## Group 4 — Consolidation (low risk)

13. Merge the overlapping location data modules into one source of truth and delete the leftovers.
14. Replace remaining `console.error`-only failure paths with user-visible messaging consistent with the rest of the app.

## Technical notes

- Error boundary: a small class component with `componentDidCatch` (still the only supported mechanism) wrapping `<Suspense>` inside `AppRoutes`, plus a per-route `key` reset on navigation.
- Query migration: `@tanstack/react-query` is already provided app-wide with 5 min `staleTime` / 30 min `gcTime`; only `useTrails` uses it today. Query keys scoped by slug and `user.id`.
- Payload types: new `src/types/edge.ts`, consumed by `invokeCached<T>` generics so the boundary is typed once.
- Verification after each group: TypeScript check, the existing Playwright specs under `e2e/`, plus a browser pass on `/`, `/map`, a title page, a location page, and a profile.

## Out of scope

No changes to design, copy, routes, database schema, RLS, or edge-function behaviour.
