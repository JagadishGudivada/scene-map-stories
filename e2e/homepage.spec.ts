import { test, expect, collectConsoleErrors } from "./helpers";

test.describe("homepage", () => {
  test("renders the front door without console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Brand + a single H1 (SEO requirement).
    await expect(page.getByText(/sarevista/i).first()).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);

    // Title tag is app-specific, never the Lovable default.
    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);
    expect(title).not.toMatch(/lovable/i);

    await page.waitForTimeout(1500);
    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("search input accepts typing", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const searchButton = page.getByRole("button", { name: /open search/i });
    if (await searchButton.isVisible().catch(() => false)) {
      await searchButton.click();
    }

    const input = page.getByPlaceholder(/search a movie, series, or book/i).first();
    await expect(input).toBeVisible();
    await input.fill("Harry Potter");
    await expect(input).toHaveValue("Harry Potter");
  });
});
