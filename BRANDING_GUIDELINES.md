# Sarevista — Branding Guidelines

> **"Not a list. Your memory map."**

This document is the visual identity source of truth. It is generated from the live design system in `src/index.css`, `tailwind.config.ts`, and `src/components/Logo.tsx`. When these drift, the code wins — update this file.

---

## 1. Brand Identity

### Mission
Sarevista turns what you watch and read into where you go. It is a cinematic travel platform where users discover, save, and share the real places behind movies, series, and books — and build a personal map of the ones they have stood in.

### Taglines
- **Primary:** "Not a list. Your memory map."
- **Headline:** "Turn the stories you love into places you visit."
- **Support:** "Every show is filmed somewhere real. We help you find it — and visit."

### Positioning
Sarevista is not a filming-locations directory. Directories list pins; Sarevista builds a personal, shareable memory map (passport, stamps, fog-of-war map, Memory Lane). This distinction should be visible in copy, not just features.

### Target Audience
- Film and series enthusiasts who travel to iconic locations
- Travel-curious cinephiles who want editorial-quality location guides
- Millennial/Gen Z creators documenting visits to famous scenes

### Brand Personality
| Trait | Expression |
|---|---|
| **Cinematic** | AMOLED-black canvas, two-tone gold, grain, scrims |
| **Premium** | Glassmorphism surfaces, editorial serif headings, generous spacing |
| **Warm** | Golden-hour gold and amber, ivory type |
| **Exploratory** | Interactive maps, trails, discovery feeds, community sharing |
| **Dense (desktop)** | IMDb-inspired information density; mobile stays glanceable |

---

## 2. Color Palette

### Dark Theme (default, `:root`)

| Role | CSS Variable | HSL | Usage |
|---|---|---|---|
| Background | `--background` | `0 0% 5%` | Page background (near-AMOLED) |
| Foreground | `--foreground` | `40 33% 94%` | Primary text (warm ivory) |
| Card | `--card` | `0 0% 8%` | Card surfaces |
| Popover | `--popover` | `0 0% 9%` | Popovers, dropdowns |
| Primary (Amber) | `--primary` | `38 80% 56%` | CTAs, accents, active states |
| Primary Foreground | `--primary-foreground` | `0 0% 5%` | Text on amber |
| Secondary (Teal) | `--secondary` | `180 38% 39%` | Secondary accents, series tags |
| Muted | `--muted` | `0 0% 12%` | Muted surfaces |
| Muted Foreground | `--muted-foreground` | `40 10% 58%` | Metadata, timestamps |
| Accent | `--accent` | `38 80% 56%` | Hover/selected accents |
| Destructive | `--destructive` | `0 70% 50%` | Errors, danger |
| Border | `--border` | `0 0% 14%` | Card/input borders |
| Input | `--input` | `0 0% 12%` | Input backgrounds |
| Ring | `--ring` | `38 80% 56%` | Focus rings |

### Light Theme (`.light` on `<html>`)

| Role | CSS Variable | HSL |
|---|---|---|
| Background | `--background` | `36 55% 93%` |
| Foreground | `--foreground` | `220 15% 15%` |
| Card | `--card` | `0 0% 100%` |
| Primary | `--primary` | `38 80% 48%` |
| Primary Foreground | `--primary-foreground` | `0 0% 100%` |
| Secondary | `--secondary` | `180 38% 36%` |
| Muted | `--muted` | `40 18% 93%` |
| Muted Foreground | `--muted-foreground` | `220 8% 46%` |
| Border | `--border` | `40 12% 84%` |
| Input | `--input` | `40 12% 88%` |

Light mode keeps depth by using **dark scrims/gradients over imagery** (`--gradient-card` fades to dark ink, not to paper).

### Custom Tokens

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--amber` | `38 80% 56%` | `38 80% 48%` | Primary accent |
| `--amber-dim` | `38 60% 40%` | `38 65% 38%` | Dimmed amber |
| `--teal` | `180 38% 39%` | `180 42% 32%` | Secondary accent |
| `--teal-dim` | `180 30% 28%` | `180 35% 24%` | Dimmed teal |
| `--ivory` | `40 33% 94%` | `220 15% 15%` | Warm white / inverted |
| `--charcoal` | `0 0% 5%` | `0 0% 5%` | Deep black (constant) |
| `--overlay` / `--overlay-foreground` | `0 0% 5%` / `40 33% 94%` | — | Always-dark overlays on media |

Tailwind exposes these as `amber`, `amber-dim`, `teal`, `teal-dim`, `ivory`, `charcoal`, `overlay`.

### Two-Tone Gold System

A semantic distinction — use it deliberately:

| Utility | Value | Meaning |
|---|---|---|
| `.bg-gold-soft` / `.text-gold-soft` | `linear-gradient(135deg, #F6D9A8, #E8A24A)` | Structural / neutral gold: frames, labels, hairlines |
| `.bg-gold-deep` / `.text-gold-deep` | `linear-gradient(135deg, #F4C77B, #D9903A 55%, #B5651D)` | Reserved for "the place you can go": map pins, primary CTAs, the `VISTA` in the wordmark |
| `.ring-gold-hairline` | `inset 0 0 0 1px rgba(232,162,74,0.55)` | 1px premium gold hairline |

### Glass Tokens

| Token | Dark | Light |
|---|---|---|
| `--glass-bg` | `0 0% 100% / 0.05` | `0 0% 100% / 0.70` |
| `--glass-border` | `0 0% 100% / 0.10` | `220 10% 50% / 0.15` |
| `--glass-hover` | `0 0% 100% / 0.08` | `0 0% 100% / 0.85` |

### Gradients

| Token | Purpose |
|---|---|
| `--gradient-hero` | Hero image → background fade |
| `--gradient-card` | Card image bottom fade |
| `--gradient-amber` | Amber gradient text/buttons |
| `--gradient-teal` | Teal gradient elements |
| `--gradient-shimmer` | Sweep highlight |

Tailwind: `bg-gradient-hero`, `bg-gradient-card`, `bg-gradient-amber`, `bg-gradient-teal`.

---

## 3. Typography

### Font Stack

| Role | Family | Tailwind | Weights |
|---|---|---|---|
| **Body / UI** | Outfit (falls back to Inter) | `font-sans` | 300–700 |
| **Headings** | Lora (serif, often italic) | `font-serif` | 400–700 + italics |
| **Data / Coords** | JetBrains Mono | `font-mono` | 400, 500 |
| **Tech / stamps** | Share Tech Mono | `font-share` | 400 |

Loaded via a single Google Fonts `@import` at the top of `src/index.css`.

`h1, h2, h3` are Lora with `letter-spacing: -0.02em`. `body` is Outfit with `font-feature-settings: "cv11", "ss01"` and antialiasing.

Use `.font-serif-italic` for the editorial italic serif treatment.

### Hierarchy

| Element | Desktop | Mobile | Font |
|---|---|---|---|
| Hero title | 56–88px | 28–34px | Lora Italic 400 |
| Page title | 40–56px | 24–28px | Lora Italic 400 |
| Section heading | 28–36px | 20–22px | Lora Italic 400 |
| Card title | 16–22px | 14–16px | Lora Italic 400 |
| Body | 15–16px | 14px | Outfit 400 |
| Caption / meta | 12–13px | 11–12px | Outfit 400 |
| Data / coords / stamps | 11–13px | 10–11px | JetBrains Mono / Share Tech Mono |

Mobile scales down aggressively (IMDb-style) — secondary metadata is often hidden entirely to keep cards glanceable.

---

## 4. Logo & Wordmark

`src/components/Logo.tsx` renders the image mark plus the text wordmark.

- **Mark:** `src/assets/sarevista-logo-transparent-cropped.png` (gold baked in).
- **Wordmark:** `Sare` in ivory (`#F5F0E8`, ink `#14100D` in light mode) + `VISTA` in gold-deep gradient (`#F4C77B → #D3771F`), Lora italic 500, `letter-spacing: 0.02em`.
- **Variants:** `full` (mark + wordmark), `icon`, `wordmark`.
- **Sizes:** `xs` 20px → `xl` 60px, plus `responsive` mode with breakpoint-aware heights.
- **Beta pill:** uppercase Inter 10px, gold border `#D3771F`, gold text `#F4C77B`, fully rounded.
- The tagline, when shown, sits directly beneath the logo in the navigation, using `.text-amber-gradient` + serif italic + wide tracking.

Do not recolour the mark, stretch the lockup, or set the wordmark in a non-serif face.

---

## 5. UI Components

### Buttons

| Variant | Style |
|---|---|
| **Primary** | `bg-primary text-primary-foreground` (amber fill, dark text) |
| **Gold CTA** | `.bg-gold-deep` — reserved for "go there" actions (Plan trip, Save spot) |
| **Secondary** | `bg-secondary text-secondary-foreground` (teal) |
| **Outline** | `border border-input bg-background` |
| **Ghost** | `hover:bg-accent` |
| **Destructive** | `bg-destructive` |
| **Link** | `text-primary underline-offset-4` |

Sizes: `sm` (h-9), `default` (h-10), `lg` (h-11), `icon` (h-10 w-10). Hero CTAs may layer `.shimmer-sweep` (3s ease-in-out infinite).

### Cards & Media

- **CinemaCard** — title cards (`sm` h-48, `md` h-64, `lg` h-80): cover, type badge, save toggle, rating/year, up to 2 location chips. Fade-up on enter, `scale(1.03)` on hover.
- **PostCard** — social card with avatar, image, location overlay, like/save/comment/share, caption with film tag.
- **SavedCard** — passport entries with 3D tilt on hover.
- **StatCard** — animated counters in the profile stat bar.
- Always apply `.scrim-bottom` to image cards with overlaid text — never assume the artwork is dark enough.

### Badges

| Type | Class | Colors |
|---|---|---|
| Movie | `.badge-movie` | amber 15% bg / amber text / amber 30% border |
| Series | `.badge-series` | teal 15% bg / light teal text / teal 30% border |
| Book | `.badge-book` | purple 15% bg / purple text / purple 30% border |
| Tier | `TierBadge` | gold gradient pill, mono uppercase, `tracking-[0.14em]` |
| Stamp | `PassportStampBadge` | Share Tech Mono, stamped-ink treatment |

### Navigation

- **Desktop:** top bar with logo + tagline, nav links (Home, Explore, Map, Titles), expanding search, theme toggle, notifications, "Add Title" CTA, avatar.
- **Mobile:** hamburger opening a Framer Motion side drawer (IMDb-style). The old bottom tab bar is retired.
- **Layout rule:** absolute/fixed elements use `pt-16` / `top-20` to clear the sticky header.

### Signature Sections

`HeroBanner` (auto-advancing 6s carousel), `QuickFilterChips`, `HowItWorks`, `TrendingOnScreen`, `IconicLocations`, `TrailsAndTours`, `WhySarevista`, `FromThePage` (book covers via Open Library), `PopularLocations`, `TrendyScreenSpots`, `TrailerSection`.

### Maps

- MapLibre GL for the main map; Leaflet/CARTO in legacy components.
- Custom SVG gold pins; `MapPinHalo` for emphasis; `MapVignette` for cinematic edge darkening.
- Popups are chromeless: transparent MapLibre containers with a `.sarevista-map-popup` glass card inside.
- `LocationDetailPanel` slides in with Ken-Burns imagery and gold accents.

### Profile / Gamification

Fog-of-war world map with gold country reveals, animated stat bar, reveal achievement cards, milestone confetti celebrations, explorer tier badges, Memory Lane story replay, and shareable Instagram-story journey cards (`src/lib/shareCard.ts`).

---

## 6. Design Principles

### Glassmorphism
```css
.glass {
  background: hsl(var(--glass-bg));
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid hsl(var(--glass-border));
}
```
`.glass-hover` is the same recipe at the hover token.

### Grain
`.grain` adds an `feTurbulence` SVG noise layer via `::after` at `opacity: 0.4` over a 4% noise rect (~1.6% effective), inheriting border radius.

### Radius Scale
Base `--radius: 0.75rem` (12px) → `sm` 8px, `md` 10px, `lg` 12px, `xl` 16px, `2xl` 20px.

### Shadows

| Tailwind | Dark value | Usage |
|---|---|---|
| `shadow-amber` | `0 0 30px hsl(38 80% 56% / 0.25)` | Amber glow on hover/active |
| `shadow-card` | `0 8px 32px hsl(0 0% 0% / 0.4)` | Card elevation |
| `shadow-float` | `0 20px 60px hsl(0 0% 0% / 0.6)` | Floating/modal elements |

Light mode softens all three. `.amber-ring` adds a 2px amber ring plus glow.

### Animation

| Name | Duration | Description |
|---|---|---|
| `fade-up` | 0.6s ease-out | `translateY(20px) → 0` with opacity |
| `fade-in` | 0.4s ease-out | Opacity `0 → 1` |
| `slide-left` | — | Marquee/track translate `0 → -50%` |
| `shimmer` | 1.5s infinite | Loading skeleton sweep |
| `pulse-amber` | 2s infinite | Amber box-shadow pulse |
| `shimmer-sweep` | 3s ease-in-out infinite | CTA highlight sweep |
| `accordion-down/up` | 0.2s ease-out | Radix accordion |

Framer Motion handles page/panel transitions, drawers, stat counters, reveals, and Memory Lane. Respect reduced-motion preferences for looping effects.

### Spacing & Layout
- Container: max-width `1400px`, centered, `2rem` padding.
- Sections: `py-12` to `py-24` desktop, tighter on mobile; `px-4` to `px-6`.
- Card gaps: `gap-4` to `gap-6`. Bento grids: `grid-cols-3` desktop → `grid-cols-1` mobile.

### Dark-First Responsive
Dark is the default (`:root`); light is opt-in via `.light`. Mobile breakpoint `< 768px` (`md:`). Design mobile-first, then add desktop density.

---

## 7. Theme System

```tsx
// src/hooks/use-theme.tsx
const [theme, setTheme] = useState<"dark" | "light">(
  () => (localStorage.getItem("sarevista-theme") as Theme) || "dark"
);
```

- **Storage key:** `sarevista-theme`
- **Mechanism:** toggles the `.light` class on `document.documentElement`
- **Toggle:** Sun/Moon icon in the navigation

---

## 8. Non-Negotiables

1. **No hardcoded colors** in components — no `text-white`, `bg-black`, `bg-[#...]`. Use semantic tokens so both themes work. The only sanctioned literals are the gold-gradient utilities and the logo/wordmark styles.
2. **Add new colors as HSL variables** in `src/index.css` and expose them in `tailwind.config.ts`.
3. **Gold-deep is reserved** for pins, primary "go there" CTAs, and `VISTA`. Everything else uses gold-soft or amber tokens.
4. **Serif for headings, Outfit for UI, mono for data.** Never mix these roles.
5. **Scrim every image that carries text.**
6. **Check both themes** before shipping a visual change.
7. **Reuse existing primitives** in `src/components/ui/` before inventing new ones.

---

## 9. File Architecture

| Path | Purpose |
|---|---|
| `src/index.css` | CSS variables, glass/grain/gold utilities, badges, map overrides |
| `tailwind.config.ts` | Colors, fonts, radii, shadows, gradients, keyframes |
| `src/hooks/use-theme.tsx` | Theme provider and `useTheme` hook |
| `src/components/Logo.tsx` | Logo lockup and wordmark |
| `src/components/ui/` | shadcn/Radix primitives |
| `src/components/` | Feature components (CinemaCard, HeroBanner, Navigation, …) |
| `src/components/map/` | Map markers, vignette, panels, trail map |
| `src/components/profile/` | Fog-of-war map, Memory Lane, stats, tiers, celebrations |
| `src/lib/shareCard.ts` | Shareable journey/story card rendering |
| `src/lib/mockData.ts`, `src/lib/mapData.ts` | Placeholder content and pin data |

---

*Source of truth for visual identity — see [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for product and engineering context.*
