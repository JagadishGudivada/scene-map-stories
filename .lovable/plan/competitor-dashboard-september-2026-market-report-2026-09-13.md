# Competitor Dashboard + September 2026 Market Report

Two deliverables: a private strategy page inside the app, and a downloadable market analysis report.

## 1. Private competitor dashboard --- Don't create this one.

A hidden page at `/strategy` — not linked from the menu or footer, excluded from search engines and the sitemap. You reach it by typing the address.

What it shows:

- **Positioning line at the top** — one sentence on what makes Sarevista different from everyone else (the memory map / passport layer, not catalogue size).
- **Competitor cards** — one per alternative: SetJetters, Moveler, Cinemapper, SceneMap, SpotAtlas, plus generic "atlas" blogs. Each card carries what it does well, where it stops, and its money model.
- **Feature comparison table** — rows for the things that matter (map discovery, per-title pages, scene/photo matching, saved visit history, badges and tiers, trails and day plans, books alongside film, social feed, trip booking links). Columns for Sarevista and each rival, with clear yes / partial / no marks. Horizontally scrollable on mobile.
- **Pricing model row set** — free vs paid app vs ads vs affiliate, and where Sarevista sits.
- **Search demand panel** — the key search-volume estimates with the source and market named next to them.
- **Whitespace list** — the three or four gaps nobody currently owns, plus the two overlaps that are genuine risks.

All content is written into the page as structured data, so it reads instantly and needs no database or logins.

## 2. Market analysis report (downloadable)

A PDF you can save and share, styled to the site's identity (gold on black, Lora headings), covering:

1. Executive summary with the verdict.
2. Market size and growth for screen-inspired travel as of September 2026.
3. Audience sizing: who they are, how many, and how much of that is realistically reachable.
4. Competitor landscape with a comparison table.
5. Search demand reality check.
6. Money model comparison.
7. Risks and what would make this a bad bet.
8. "Late to market or not" recommendation with the reasoning and the first three moves.

Every external figure is labelled as an estimate with its source and date. Where evidence is missing, the report says so rather than filling the gap.

## Research before writing

- Fresh competitor checks on each rival's public site for current features and pricing.
- Search-demand and competitive-gap figures pulled for the film-location category, with the market named.
- Public reports on set-jetting market size and traveller share for the sizing section.

Both the page and the report draw from the same researched facts so they never disagree.

## Technical notes

- New route `/strategy` in `src/App.tsx`, lazy-loaded like the rest; page at `src/pages/Strategy.tsx` with `noindex` via the existing `Seo` component and no sitemap entry.
- Content lives in a typed module (`src/data/competitors.ts`) consumed by the page — single source of truth, easy to update later.
- Table and cards built from existing shadcn primitives and current design tokens; no new colour values.
- Report generated with ReportLab into `/mnt/documents`, then every page rendered to images and visually checked before delivery.