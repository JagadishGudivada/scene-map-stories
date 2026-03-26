

# Generate BRANDING_GUIDELINES.md for Sarevista

## What
Analyze the entire codebase (CSS variables, Tailwind config, components, typography, animations) and produce a comprehensive `BRANDING_GUIDELINES.md` file saved to the repository root.

## How
1. **Create `BRANDING_GUIDELINES.md`** at the project root with these sections extracted directly from the code:
   - **Brand Identity** — mission, tagline ("Not a list. Your memory map."), target audience, and the "cinematic travel" positioning
   - **Color Palette** — all HSL tokens from `:root` and `.light`, converted to hex equivalents, organized by role (background, foreground, primary/amber, secondary/teal, destructive, muted, glass tokens)
   - **Typography** — Google Fonts (Instrument Serif, Inter, JetBrains Mono), weights loaded, heading hierarchy (`h1-h3` use Instrument Serif with `-0.02em` tracking, body uses Inter, monospace data uses JetBrains Mono), and specific size patterns observed (88px hero, 52px page titles, 36px section headings, etc.)
   - **UI Components** — documented atomic elements: Button variants (primary amber gradient, outlined glass, ghost), CinemaCard (3 sizes, type badges, save toggle), PostCard (social card with engagement), HeroBanner (carousel), TrendingRow (horizontal scroll), PopularLocations (pill chips), Navigation (top bar + mobile bottom bar), glassmorphism card pattern, badge types (movie/series/book)
   - **Design Principles** — glassmorphism specs (blur 16px, saturate 180%), grain texture overlay, border radius scale (sm/md/lg/xl/2xl from `--radius: 0.75rem`), shadow system (amber/card/float), animation library (fade-up, fade-in, shimmer, pulse-amber, shimmer-sweep), and dark-first responsive design approach
   - **Theme System** — dark (default) and light mode token mapping, toggle mechanism via `useTheme` hook and `localStorage`

This is a single-file creation task — no other files are modified.

