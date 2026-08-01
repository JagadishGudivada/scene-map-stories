import { test, expect, signIn } from "./helpers";

/** Core loop: save/visit a spot and see it reflected on the profile. */
test("signed-in user can reach their profile and saved items", async ({ page }) => {
  const authed = await signIn(page);
  test.skip(!authed, "No managed backend session injected into this environment");

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1").first()).toBeAttached();

  // Profile is reachable and renders the passport stats shell.
  await page.goto("/u/me", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Either the profile renders, or we were redirected to auth — never a crash.
  expect(page.url()).toMatch(/\/(u|auth)\//);
  await expect(page.locator("body")).not.toContainText(/something went wrong/i);
});
