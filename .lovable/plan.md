# Responsive cinematic 3D homepage carousel

## Outcome
Replace the flat homepage hero slideshow with the selected portrait-led cinematic stage while preserving Sarevista’s current content, destinations, and dark editorial identity.

## Build
1. Rework the hero into a layered perspective scene: the active title stays centered and full-strength; neighboring titles angle inward, recede, dim, and remain clickable.
2. Crossfade a large blurred version of the active artwork behind the stage, using dark vignettes and the existing amber/teal palette so text remains readable in both themes.
3. Add direct drag/swipe navigation, horizontal trackpad and mouse-wheel navigation with gesture thresholds, plus keyboard and existing arrow controls. Pause auto-advance during interaction and when the page is hidden.
4. Replace the dots with compact selectable progress bars and a two-digit current/total counter. Announce slide changes accessibly.
5. Adapt the geometry by screen size: visible flanks on desktop/laptop, restrained card peeks on tablet, and one primary portrait card with touch-safe controls on mobile. Respect reduced-motion preferences.

## Technical details
- Use React, Framer Motion, and CSS 3D transforms already in the project; no WebGL dependency is needed.
- Keep the current title data, responsive image sources, navigation payloads, save behavior, and six-second autoplay.
- Use semantic design tokens and the shared Button control for all carousel actions.
- Prevent accidental page scrolling only for intentional horizontal carousel gestures; vertical scrolling remains natural on mobile.

## Validation
- Check desktop (1440px), laptop (1280px), tablet (768px), and mobile (390px).
- Verify arrows, progress controls, keyboard, drag/swipe, horizontal wheel, autoplay, reduced motion, focus states, image loading, and navigation.
- Run the focused homepage checks and inspect screenshots for overlap, clipping, and blank imagery.
