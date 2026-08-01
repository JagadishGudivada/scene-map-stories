# Smoke tests

Critical-path Playwright checks. Run before every Cloudflare deploy:

```bash
npm run e2e:install   # one-time: downloads Chromium
npm run dev           # in another terminal (or set E2E_BASE_URL)
npm run e2e
npm run e2e:ui        # debug interactively
```

Against a deployed build:

```bash
E2E_BASE_URL=https://sarevista.com npm run e2e
```

| Spec | Guards |
|---|---|
| `homepage` | front door renders, single H1, real title tag, no console errors |
| `title-search` | search → title detail route + canonical/description meta |
| `plan-trip` | every affiliate URL is https and carries its partner ID (revenue guard) |
| `save-to-passport` | signed-in profile loop (skips without an injected session) |
| `public-passport` | shareable passport route renders for anonymous visitors |
| `trail-page` | trail renders stops, breadcrumbs and BreadcrumbList JSON-LD |
| `mobile-smoke` | drawer + search at a phone viewport |

Specs skip themselves when the content or session they need is absent, so the
suite is safe to run against any environment.
