import { test, expect } from "./helpers";

/**
 * Core funnel: search a title → land on its detail page with locations.
 * Titles are AI/TMDB backed, so we assert the route + shell, not exact copy.
 */
test("search a title and open its detail page", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const openSearch = page.getByRole("button", { name: /open search/i });
  if (await openSearch.isVisible().catch(() => false)) {
    await openSearch.click();
  }

  const input = page.getByPlaceholder(/search a movie, series, or book/i).first();
  await expect(input).toBeVisible();
  await input.fill("Harry Potter");

  // Wait for the suggestion list, then pick the first result.
  const firstResult = page.getByRole("option").first();
  const hasResults = await firstResult
    .waitFor({ state: "visible", timeout: 12_000 })
    .then(() => true)
    .catch(() => false);

  if (hasResults) {
    await firstResult.click();
  } else {
    await input.press("Enter");
  }

  await page.waitForURL(/\/(title|explore)\//, { timeout: 25_000 }).catch(() => {});
  expect(page.url()).toMatch(/\/(title|explore)/);
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

test("a title detail route renders SEO metadata", async ({ page }) => {
  await page.goto("/title/harry-potter-and-the-philosophers-stone-movie", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });

  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveCount(1);

  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  expect((description ?? "").length).toBeGreaterThan(30);
});
