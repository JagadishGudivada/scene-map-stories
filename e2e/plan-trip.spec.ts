import { test, expect } from "./helpers";
import { AFFILIATE_IDS, AFFILIATE_PARTNERS } from "../src/lib/affiliates";

/**
 * Revenue guard. If a partner link loses its affiliate ID or stops being an
 * absolute https URL, the commission silently disappears — so assert both.
 */
const ctx = {
  originLabel: "London (LHR)",
  originQuery: "LHR",
  locationName: "Edinburgh",
  spotName: "Victoria Street",
  lat: 55.9486,
  lng: -3.1936,
};

test.describe("affiliate URLs", () => {
  for (const partner of AFFILIATE_PARTNERS) {
    test(`${partner.partner} builds a valid outbound URL`, async () => {
      const url = partner.buildUrl(ctx);
      expect(url.startsWith("https://"), `not https: ${url}`).toBe(true);
      expect(() => new URL(url)).not.toThrow();
    });
  }

  test("configured partner IDs actually reach the URL", async () => {
    for (const [key, idParam] of Object.entries(AFFILIATE_IDS)) {
      if (!idParam) continue; // not signed up yet
      const value = idParam.split("=")[1] ?? "";
      const built = AFFILIATE_PARTNERS.map((p) => p.buildUrl(ctx)).join(" ");
      expect(built, `${key} id missing from every outbound URL`).toContain(value);
    }
  });
});

test("Plan Your Trip dialog opens from a landing-page card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const planButton = page.getByRole("button", { name: /plan a visit/i }).first();
  const visible = await planButton
    .waitFor({ state: "visible", timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!visible, "No trending spots seeded in this environment");

  await planButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/plan your trip/i).first()).toBeVisible();
  await expect(dialog.getByText(/affiliate/i)).toBeVisible();

  // Every card links out over https with sponsored rel.
  const links = dialog.locator("a[href^='https://']");
  expect(await links.count()).toBeGreaterThan(2);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("rel", /sponsored/);
  }
});
