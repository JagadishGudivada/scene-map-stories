# Deploying Sarevista to Cloudflare Workers

This project is configured to deploy as a **static-assets Worker** on Cloudflare,
using Wrangler v3+ and the modern [`assets`](https://developers.cloudflare.com/workers/static-assets/)
binding. The Vite build output (`./dist`) is uploaded and served from Cloudflare's
edge network. SPA history-mode routing is handled by `not_found_handling = "single-page-application"`.

The backend (database, auth, edge functions) continues to run on **Lovable Cloud /
Supabase** — Cloudflare only hosts the static frontend.

---

## 1. One-time setup

### 1.1 Install Wrangler

```bash
npm install -D wrangler
# or globally:
npm install -g wrangler
```

### 1.2 Authenticate

```bash
npx wrangler login
```

Opens a browser tab to authorize Wrangler against your Cloudflare account.

For CI/CD, create an API token (Account → API Tokens → "Edit Cloudflare Workers"
template) and export it instead:

```bash
export CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
export CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 2. Configure environment variables

The Vite build needs the public Supabase keys at **build time** (they're inlined
into the bundle). Wrangler supports two ways to provide them:

### Option A — `.env.production` (recommended for local builds)

Already provided in `.env`. Confirm these are present:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

These are **publishable** keys — safe to commit and ship in the client bundle.

### Option B — CI environment variables

In your CI provider (GitHub Actions, etc.), set the same `VITE_*` variables as
build-time env vars before running `wrangler deploy`.

---

## 3. Secrets (runtime, server-side only)

Because this deployment is **assets-only** (no server code runs on the Worker),
there is currently **no need to set Worker runtime secrets**. All server-side
secrets (`LOVABLE_API_KEY`, `TMDB_API_KEY`, `MAPBOX_TOKEN`, Supabase service-role
key, etc.) remain on Lovable Cloud / Supabase Edge Functions and are accessed
from there.

If you later add a Worker script (e.g. for SSR, signed URLs, or a proxy), set
secrets with:

```bash
npx wrangler secret put TMDB_API_KEY --env production
npx wrangler secret put MAPBOX_TOKEN --env production
# repeat for each secret; Wrangler prompts for the value
```

List configured secrets:

```bash
npx wrangler secret list --env production
```

Delete a secret:

```bash
npx wrangler secret delete OLD_KEY --env production
```

---

## 4. Build & deploy

### Local deploy

```bash
# Build the SPA and deploy to the default (top-level) environment
npm run build
npx wrangler deploy

# Deploy to the production environment defined in wrangler.toml
npx wrangler deploy --env production

# Preview environment
npx wrangler deploy --env preview
```

`wrangler.toml` already declares `[build] command = "npm run build"`, so
`wrangler deploy` will run the build automatically if you skip the manual step.

### Dry run (no upload)

```bash
npx wrangler deploy --dry-run --outdir=.wrangler/dry-run
```

### Tail live logs

```bash
npx wrangler tail --env production
```

---

## 5. Local preview against Cloudflare's runtime

```bash
npm run build
npx wrangler dev
```

Serves `./dist` through the local Workers runtime at `http://localhost:8787`,
including the SPA fallback and `_headers` rules.

For the standard Vite dev server (HMR, etc.), keep using:

```bash
npm run dev
```

---

## 6. Custom domain

1. In the Cloudflare dashboard: **Workers & Pages → sarevista → Settings →
   Triggers → Custom Domains → Add Custom Domain**.
2. Enter `sarevista.com` (and/or `www.sarevista.com`).
3. Cloudflare automatically provisions the certificate and routes traffic.

DNS must already be on Cloudflare for the apex/subdomain you attach.

---

## 7. Sitemap

`scripts/generate-sitemap.mjs` runs automatically during `vite build` (wired
through `vite.config.ts`) and writes `public/sitemap.xml`. The file is included
in the `./dist` upload, so `https://sarevista.com/sitemap.xml` works out of the
box on Cloudflare.

To regenerate locally:

```bash
npm run build
```

---

## 8. Rollback

List recent deployments and roll back to a known-good version ID:

```bash
npx wrangler deployments list --env production
npx wrangler rollback <deployment-id> --env production
```

---

## 9. GitHub Actions (optional)

Minimal workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_SUPABASE_PROJECT_ID: ${{ secrets.VITE_SUPABASE_PROJECT_ID }}
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production
```

---

## 10. Quick reference

| Task                        | Command                                          |
| --------------------------- | ------------------------------------------------ |
| Login                       | `npx wrangler login`                             |
| Deploy (prod)               | `npx wrangler deploy --env production`           |
| Local Workers preview       | `npx wrangler dev`                               |
| Set secret                  | `npx wrangler secret put NAME --env production`  |
| List secrets                | `npx wrangler secret list --env production`     |
| Tail logs                   | `npx wrangler tail --env production`             |
| List deployments            | `npx wrangler deployments list --env production` |
| Rollback                    | `npx wrangler rollback <id> --env production`   |

---

## Notes & gotchas

- **Don't put server secrets in `VITE_*` variables** — anything prefixed `VITE_`
  is inlined into the public bundle. Server-only secrets must stay on Lovable
  Cloud / Supabase or be set with `wrangler secret put` against a real Worker
  script.
- The `public/_headers` file is honored by Cloudflare Workers' assets pipeline,
  including the CSP and long cache for `/assets/*`.
- The `public/_redirects` SPA fallback is **not** needed — `wrangler.toml`'s
  `not_found_handling = "single-page-application"` replaces it.
- `compatibility_flags = ["nodejs_compat"]` is enabled so a future Worker script
  can use Node built-ins if needed; it has no cost for assets-only deploys.
