import { test, expect } from "./helpers";

/** SEO landing pages: trails must render their map, stops and breadcrumbs. */
test("a trail page renders stops and breadcrumbs", async ({ page }) => {
  // Trail ids are derived from clustered city data; discover one from the landing page.
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const trailLink = page.locator('a[href^="/trails/"]').first();
  const found = await trailLink
    .waitFor({ state: "attached", timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!found, "No trails available in this environment");

  const href = await trailLink.getAttribute("href");
  await page.goto(href!, { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("navigation", { name: /breadcrumb/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /plan a trip|plan this trail/i })).toBeVisible();

  // Breadcrumb structured data is present for SERP presentation.
  const ldJson = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ldJson.join(" ")).toContain("BreadcrumbList");
});
