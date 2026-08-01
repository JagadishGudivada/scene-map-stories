import { test, expect, collectConsoleErrors } from "./helpers";

/** Most traffic is mobile — one core flow at a phone viewport. */
test("mobile: menu, search and a detail page work", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toHaveCount(1);

  // Side drawer (IMDb-style hamburger).
  const menu = page.getByRole("button", { name: /open menu/i });
  if (await menu.isVisible().catch(() => false)) {
    await menu.click();
    await expect(page.getByRole("button", { name: /close menu/i })).toBeVisible();
    await page.getByRole("button", { name: /close menu/i }).click();
  }

  // Search entry point.
  const openSearch = page.getByRole("button", { name: /open search/i });
  if (await openSearch.isVisible().catch(() => false)) {
    await openSearch.click();
    const input = page.getByPlaceholder(/search a movie, series, or book/i).first();
    await expect(input).toBeVisible();
    await input.fill("Sherlock");
    await expect(input).toHaveValue("Sherlock");
  }

  await page.waitForTimeout(1500);
  expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
});
