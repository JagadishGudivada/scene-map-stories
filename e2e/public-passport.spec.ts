import { test, expect } from "./helpers";

/** Viral loop: a public passport must render for anonymous visitors. */
test("public passport route renders or 404s cleanly", async ({ page }) => {
  await page.goto("/passport/sarevista", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const body = await page.locator("body").innerText();
  // Either a real passport, or a graceful "not found" — never a blank crash.
  expect(body.trim().length).toBeGreaterThan(20);
  expect(body).not.toMatch(/something went wrong|cannot read propert/i);
});
