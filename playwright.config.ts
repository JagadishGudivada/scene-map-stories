import { defineConfig, devices } from "@playwright/test";

/**
 * Critical-path smoke tests. Kept separate from the Vitest unit suite in `src/`.
 * Run locally against the dev server before every Cloudflare deploy:
 *   npm run test && npm run e2e && npx wrangler deploy --env production
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /mobile-smoke\.spec\.ts/,
    },
  ],
});
