# Sarevista — Branding Guidelines

> **"Not a list. Your memory map."**

---

## 1. Brand Identity

### Mission
Sarevista is a cinematic travel platform where users discover, save, and share real-world filming locations from movies, series, and books. Cinema meets travel.

### Tagline
**Primary:** "Not a list. Your memory map."
**Secondary:** "Cinema meets travel."

### Target Audience
- Film enthusiasts who travel to iconic filming locations
- Travel-curious cinephiles seeking curated, editorial-quality location guides
- Content creators documenting visits to famous scenes

### Brand Personality
| Trait | Expression |
|---|---|
| **Cinematic** | Dark-first palette, amber warmth, grain textures |
| **Premium** | Glassmorphism surfaces, editorial typography, generous spacing |
| **Warm** | Amber accents evoke golden-hour cinematography |
| **Exploratory** | Interactive maps, discovery feeds, community sharing |

---

## 2. Color Palette

### Dark Theme (Default)

| Role | CSS Variable | HSL | Hex | Usage |
|---|---|---|---|---|
| Background | `--background` | `0 0% 5%` | `#0D0D0D` | Page background |
| Foreground | `--foreground` | `40 33% 94%` | `#F5F0E8` | Primary text (warm ivory) |
| Card | `--card` | `0 0% 8%` | `#141414` | Card surfaces |
| Card Foreground | `--card-foreground` | `40 33% 94%` | `#F5F0E8` | Card text |
| Primary (Amber) | `--primary` | `38 80% 56%` | `#E8A838` | CTA buttons, accents, active states |
| Primary Foreground | `--primary-foreground` | `0 0% 5%` | `#0D0D0D` | Text on amber buttons |
| Secondary (Teal) | `--secondary` | `180 38% 39%` | `#3D8B8B` | Secondary accents, tags |
| Secondary Foreground | `--secondary-foreground` | `40 33% 94%` | `#F5F0E8` | Text on teal elements |
| Muted | `--muted` | `0 0% 12%` | `#1F1F1F` | Muted backgrounds |
| Muted Foreground | `--muted-foreground` | `40 10% 58%` | `#9C9488` | Metadata, timestamps |
| Destructive | `--destructive` | `0 70% 50%` | `#D93025` | Errors, danger indicators |
| Border | `--border` | `0 0% 14%` | `#242424` | Card/input borders |
| Input | `--input` | `0 0% 12%` | `#1F1F1F` | Input backgrounds |
| Ring | `--ring` | `38 80% 56%` | `#E8A838` | Focus rings |

### Custom Tokens (Dark)

| Token | HSL | Hex | Usage |
|---|---|---|---|
| `--amber` | `38 80% 56%` | `#E8A838` | Primary accent |
| `--amber-dim` | `38 60% 40%` | `#A37A29` | Dimmed amber |
| `--teal` | `180 38% 39%` | `#3D8B8B` | Secondary accent |
| `--teal-dim` | `180 30% 28%` | `#325D5D` | Dimmed teal |
| `--ivory` | `40 33% 94%` | `#F5F0E8` | Warm white |
| `--charcoal` | `0 0% 5%` | `#0D0D0D` | Deep black |

### Glass Tokens (Dark)

| Token | Value | Usage |
|---|---|---|
| `--glass-bg` | `0 0% 100% / 0.05` | Glass surface (5% white) |
| `--glass-border` | `0 0% 100% / 0.10` | Glass border (10% white) |
| `--glass-hover` | `0 0% 100% / 0.08` | Glass hover state (8% white) |

### Light Theme

| Role | CSS Variable | HSL | Hex |
|---|---|---|---|
| Background | `--background` | `42 30% 97%` | `#F8F5F0` |
| Foreground | `--foreground` | `220 15% 15%` | `#212530` |
| Card | `--card` | `0 0% 100%` | `#FFFFFF` |
| Primary | `--primary` | `38 80% 48%` | `#DC9520` |
| Secondary | `--secondary` | `180 38% 36%` | `#397F7F` |
| Muted | `--muted` | `40 18% 93%` | `#EDE9E2` |
| Muted Foreground | `--muted-foreground` | `220 8% 46%` | `#6C7078` |
| Border | `--border` | `40 12% 84%` | `#D6D2CB` |
| Glass BG | `--glass-bg` | `0 0% 100% / 0.70` | 70% white |
| Glass Border | `--glass-border` | `220 10% 50% / 0.15` | 15% grey |

### Gradients

| Name | Value | Usage |
|---|---|---|
| `--gradient-hero` | `linear-gradient(180deg, transparent 0%, bg/0.6 50%, bg 100%)` | Hero image overlay |
| `--gradient-card` | `linear-gradient(180deg, transparent 30%, bg/0.95 100%)` | Card image overlay |
| `--gradient-amber` | `linear-gradient(135deg, hsl(38 80% 56%), hsl(28 90% 50%))` | Amber gradient text/buttons |
| `--gradient-teal` | `linear-gradient(135deg, hsl(180 38% 39%), hsl(190 50% 30%))` | Teal gradient elements |

---

## 3. Typography

### Font Stack

| Role | Family | Source | Weights Loaded |
|---|---|---|---|
| **Headings** | Instrument Serif | Google Fonts | Regular, Italic |
| **Body / UI** | Inter | Google Fonts | 300, 400, 500, 600, 700 |
| **Data / Coords** | JetBrains Mono | Google Fonts | 400, 500 |

### Heading Hierarchy

All `h1`, `h2`, `h3` elements use **Instrument Serif** with `letter-spacing: -0.02em`.

| Element | Typical Size | Font | Weight | Usage |
|---|---|---|---|---|
| Hero Title | 88px | Instrument Serif Italic | 400 | Location hero pages |
| Page Title | 48–56px | Instrument Serif Italic | 400 | Page headings |
| Section Heading | 32–36px | Instrument Serif Italic | 400 | Section titles |
| Card Title | 18–22px | Instrument Serif Italic | 400 | Card headings |
| Body | 14–16px | Inter | 400 | Paragraph text |
| Body Bold | 14–16px | Inter | 600 | Emphasized body |
| Caption/Meta | 12–13px | Inter | 400 | Timestamps, metadata |
| Data/Coords | 11–13px | JetBrains Mono | 400 | GPS coordinates, stats |

### Font Features
```css
body {
  font-feature-settings: "cv11", "ss01";
  -webkit-font-smoothing: antialiased;
}
```

---

## 4. UI Components

### Buttons

| Variant | Class/Style | Description |
|---|---|---|
| **Primary** | `bg-primary text-primary-foreground` | Amber filled, dark text |
| **Secondary** | `bg-secondary text-secondary-foreground` | Teal filled |
| **Outline** | `border border-input bg-background` | Glass-bordered |
| **Ghost** | `hover:bg-accent` | Transparent, hover reveals |
| **Destructive** | `bg-destructive` | Red filled |
| **Link** | `text-primary underline-offset-4` | Amber underlined link |

**Sizes:** `sm` (h-9), `default` (h-10), `lg` (h-11), `icon` (h-10 w-10)

**Special:** CTA buttons use `shimmer-sweep` animation (3s ease-in-out infinite) for a premium highlight effect.

### CinemaCard

The primary content card for titles (movies, series, books).

- **Sizes:** `sm` (h-48), `md` (h-64), `lg` (h-80)
- **Features:** Cover image with gradient overlay, type badge (top-left), save/bookmark toggle, rating + year, title, up to 2 location chips
- **Animation:** Fade-up on enter with configurable `delay`
- **Hover:** `scale(1.03)`, increased shadow

### PostCard

Social engagement card for community content.

- **Features:** User avatar + name, image, location overlay, like/save/comment/share actions, caption with film tag
- **State:** Local `liked`, `saved`, `likeCount` management
- **Animation:** Fade/slide-in with stagger delay

### Badge Types

| Type | Class | Colors |
|---|---|---|
| Movie | `.badge-movie` | Amber bg 15%, amber text, amber border 30% |
| Series | `.badge-series` | Teal bg 15%, light teal text, teal border 30% |
| Book | `.badge-book` | Purple bg 15%, purple text, purple border 30% |

### Navigation

- **Desktop:** Top horizontal bar with logo, nav links (Home, Explore, Map, Titles), search (expanding), theme toggle, notifications, "Add Title" CTA, avatar
- **Mobile:** Fixed bottom bar with 5 icons (Home, Explore, +Add, Map, Profile), active state uses amber

### HeroBanner

Full-viewport carousel with auto-advancing slides (6s interval).

- **Features:** Background cross-fade via `AnimatePresence`, type badge, stats, CTA buttons, dot indicators
- **Controls:** Left/right arrows, dot navigation

### TrendingRow

Horizontal scrollable row of title cards.

- **Features:** Left/right scroll buttons (280px per step), staggered fade-in
- **Card:** Cover image, type badge, location count, title, rating, year

### PopularLocations

Horizontal scroll of glassmorphism location pill chips.

- **Chip:** Flag emoji, city name, amber pin icon, title count
- **Links:** Each chip navigates to `/location/:slug`

---

## 5. Design Principles

### Glassmorphism

The signature card style used across all surfaces:

```css
.glass {
  background: hsl(0 0% 100% / 0.05);      /* --glass-bg */
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid hsl(0 0% 100% / 0.10); /* --glass-border */
}
```

Light theme adjusts to 70% white background and 15% grey border.

### Grain Texture

Applied via `.grain` utility class using an inline SVG `feTurbulence` filter:

```css
.grain::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,...feTurbulence...");
  pointer-events: none;
  opacity: 0.4; /* ~6% effective */
}
```

### Border Radius Scale

Base radius: `--radius: 0.75rem` (12px)

| Token | Value | Computed |
|---|---|---|
| `sm` | `calc(var(--radius) - 4px)` | 8px |
| `md` | `calc(var(--radius) - 2px)` | 10px |
| `lg` | `var(--radius)` | 12px |
| `xl` | `calc(var(--radius) + 4px)` | 16px |
| `2xl` | `calc(var(--radius) + 8px)` | 20px |

### Shadow System

| Name | Value | Usage |
|---|---|---|
| `shadow-amber` | `0 0 30px hsl(38 80% 56% / 0.25)` | Amber glow on hover/active |
| `shadow-card` | `0 8px 32px hsl(0 0% 0% / 0.4)` | Card elevation |
| `shadow-float` | `0 20px 60px hsl(0 0% 0% / 0.6)` | Floating/modal elements |

### Animation Library

| Name | Duration | Easing | Description |
|---|---|---|---|
| `fade-up` | 0.6s | ease-out | `translateY(20px) → 0` with opacity |
| `fade-in` | 0.4s | ease-out | Opacity `0 → 1` |
| `shimmer` | 1.5s | infinite | Loading skeleton sweep |
| `pulse-amber` | 2s | ease-in-out infinite | Amber box-shadow pulse |
| `shimmer-sweep` | 3s | ease-in-out infinite | CTA button highlight sweep |
| `accordion-down/up` | 0.2s | ease-out | Radix accordion height transitions |

### Spacing & Layout

- **Container:** max-width `1400px`, centered, `2rem` padding
- **Page sections:** typically `py-16` to `py-24` with `px-4` to `px-6`
- **Card gaps:** `gap-4` to `gap-6`
- **Bento grids:** CSS Grid with `grid-cols-3` (desktop), `grid-cols-1` (mobile)

### Dark-First Responsive Design

- Default theme is **dark** (`:root` variables)
- Light theme activated via `.light` class on `<html>`
- Mobile breakpoint: `< 768px` (Tailwind `md:`)
- All pages designed mobile-first with progressive enhancement

---

## 6. Theme System

### Implementation

Theme state is managed by a React context (`useTheme` hook) with `localStorage` persistence.

```tsx
// src/hooks/use-theme.tsx
const [theme, setTheme] = useState<"dark" | "light">(
  () => localStorage.getItem("sarevista-theme") || "dark"
);
```

- **Storage key:** `sarevista-theme`
- **Mechanism:** Adds/removes `.light` class on `document.documentElement`
- **Toggle:** Available in the navigation bar (Sun/Moon icon)

### Token Mapping

Every semantic color has both a dark and light variant defined in `src/index.css`. Components use only Tailwind semantic classes (`bg-background`, `text-foreground`, `bg-card`, etc.) — never raw hex or hardcoded colors.

| Token | Dark | Light |
|---|---|---|
| `--background` | `0 0% 5%` | `42 30% 97%` |
| `--foreground` | `40 33% 94%` | `220 15% 15%` |
| `--primary` | `38 80% 56%` | `38 80% 48%` |
| `--secondary` | `180 38% 39%` | `180 38% 36%` |
| `--muted` | `0 0% 12%` | `40 18% 93%` |
| `--card` | `0 0% 8%` | `0 0% 100%` |
| `--border` | `0 0% 14%` | `40 12% 84%` |

---

## 7. File Architecture

| Path | Purpose |
|---|---|
| `src/index.css` | All CSS variables, glass utilities, grain, badges, Leaflet overrides |
| `tailwind.config.ts` | Extended colors, fonts, shadows, gradients, animations |
| `src/hooks/use-theme.tsx` | Theme context provider and `useTheme` hook |
| `src/components/ui/` | Shadcn/ui base components (Button, Card, Badge, Dialog, etc.) |
| `src/components/` | App-specific components (CinemaCard, PostCard, HeroBanner, Navigation, etc.) |
| `src/lib/mockData.ts` | Placeholder data for titles, posts, hero slides |
| `src/lib/mapData.ts` | Map pin data and configuration |

---

*Generated from codebase analysis — Sarevista v1.0*
