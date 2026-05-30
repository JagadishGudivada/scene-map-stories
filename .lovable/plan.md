# The Reveal — one button, infinite curiosity

Forget XP, leaderboards, votes. Add **one mysterious button** on every title, location and spot page that pulls users in with a single tap and rewards them with a tiny dopamine hit: a fact, a secret, a stranger's note. No forms, no thinking, no friction.

This is the only thing we ship. It does one job: **make users tap, then tap again.**

## The button

A single floating chip, gen-z voice, rotates its label so it never feels stale:

- *"tap me 👀"*
- *"unlock a secret"*
- *"wait til you see this"*
- *"POV: you didn't know this"*
- *"don't tap this"*  ← reverse psychology
- *"one more thing…"*
- *"the internet's lowkey obsessed with this"*

Sits sticky-bottom on mobile, inline hero chip on desktop. Subtle pulse + slight tilt animation so the eye catches it.

## What's behind the tap (the "Reveal Deck")

Each tap pulls **one card** from a shuffled deck for that title / location / spot. Card flips in, swipeable. Five card types, all short, all scannable in 5 seconds:

```text
┌─────────────────────────────┐
│ 🎬 BTS                       │
│ Nolan shot this scene with   │
│ a real IMAX camera bolted    │
│ to a P-51 Mustang.           │
│                              │
│           [tap for next →]   │
└─────────────────────────────┘
```

1. **🎬 BTS** — one behind-the-scenes fact (AI-generated, cached)
2. **📍 Did you know** — a fact about the filming location ("this farmhouse is still owned by the same family")
3. **💬 Last visitor** — most recent visited_spots / posts entry: *"Ana stood here 3 days ago"* with avatar
4. **🎞️ Frame match** — film still vs satellite/street-view of the real spot, side-by-side
5. **🌙 Mood** — a one-line evocative quote about the place ("the cornfield where time bent")

Deck is **endless** — keeps shuffling, never ends with "you've seen everything." User can swipe through 1, 5 or 50 cards. No counters, no progress bar, no XP shown.

## Why this works for gen-z / millennial travellers

- **Zero hassle**: one tap, no signup gate, no form.
- **Suspense > obligation**: copy is curiosity-driven, not duty-driven ("verify this" ❌ → "wait til you see this" ✅).
- **TikTok-paced**: each card is one swipe, one beat. Same loop as scrolling Reels.
- **Quiet social proof**: "Ana stood here 3 days ago" is the only "community" signal — feels alive without asking the user to do anything.
- **Shareable**: every card has a tiny share button → opens a pre-rendered story-shaped image of just that card. That's the viral loop, not a leaderboard.

## What we DON'T build

- No XP, points, ranks, badges, leaderboards, streaks
- No "verify" / "confirm" / "vote" anywhere
- No required photo uploads, no required text, no forms
- No profile gamification

The whole concept is: **the app tells the user something cool, not the other way around.**

## Phase 1 build (small, ships fast)

```text
src/components/RevealDeck/
 ├── RevealButton.tsx       — sticky chip, rotating copy, pulse
 ├── RevealDeck.tsx         — full-screen modal, swipeable cards (framer-motion)
 ├── cards/
 │    ├── BtsCard.tsx
 │    ├── DidYouKnowCard.tsx
 │    ├── LastVisitorCard.tsx
 │    ├── FrameMatchCard.tsx
 │    └── MoodCard.tsx
 └── useRevealDeck.ts       — shuffles + fetches next card lazily
```

**Data sources (all already exist or are trivial):**
- BTS / Did you know / Mood → new edge function `reveal-cards` calling Lovable AI (`google/gemini-2.5-flash`), cached in `ai_cache` for 7 days per slug+type
- Last visitor → query existing `visited_spots` / `posts` tables, order by `created_at desc limit 1`
- Frame match → use existing `image_url` on `spots` + Google Static Maps / Mapbox satellite tile at lat/lng

**Wiring:**
- Add `<RevealButton context={{ kind: 'title' | 'location' | 'spot', slug, name }} />` to:
  - `src/pages/TitleDetail.tsx`
  - `src/pages/LocationDetail.tsx`
  - `src/pages/FilmingSpotDetail.tsx`
- No DB migration needed — `ai_cache` table already supports this pattern (same approach as `spot-details`).

**Share card:**
- Open the same card in a 9:16 framed container, html-to-image → blob → Web Share API. Card includes faint Sarevista logo. Zero backend.

## Tone & copy bank (genz voice, locked-in)

Button rotations: `tap me 👀`, `unlock a secret`, `POV: you didn't know`, `don't tap this`, `the lore is wild`, `one more thing…`, `wait til you see this`.

Card footers: `[next →]`, `[one more]`, `[ok one more]`, `[this is unhinged]`, `[okay i'm done]`.

Empty/cold state (rare): never show "no facts yet." Always synthesize via AI on first tap and cache.

## Phase 2 (only after Phase 1 lands)
- Personalised card mix based on what the user lingered on
- "Drop a card" — let the user add a one-line mood/fact, becomes a future card for the next visitor (still optional, still one-tap field)
- Geofenced cards: a card only unlocks if you're physically at the spot
- Daily card: one card per day across the whole site, on the homepage

## Approve the direction and I'll ship Phase 1
Tap-to-reveal button + 5 card types + AI edge function + share-as-story. Slot it into the three detail pages. No new tables, no auth gates, no gamification.
