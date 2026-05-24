import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockMapLibreTileRequests, mockSupabaseEdgeFunctions } from "../helpers/map-mock.helpers";

class MapViewPage {
  private readonly canvas: Locator;

  constructor(private readonly page: Page) {
    this.canvas = page.locator(".maplibregl-canvas").first();
  }

  async goto() {
    await this.page.goto("/map");
  }

  async waitForCanvasReady() {
    await expect(this.page.locator(".maplibregl-map").first()).toBeVisible({ timeout: 20_000 });
    await expect(this.canvas).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => {
      return this.canvas.evaluate((node) => {
        const canvas = node as HTMLCanvasElement;
        return canvas.width > 0 && canvas.height > 0;
      });
    }).toBeTruthy();
  }

  async clickAt(xOffset: number, yOffset: number) {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error("Map canvas is not visible for interaction.");
    await this.page.mouse.click(box.x + xOffset, box.y + yOffset);
  }
}

test.describe("map view", () => {
  test.beforeEach(async ({ page }) => {
    await mockMapLibreTileRequests(page);
    await mockSupabaseEdgeFunctions(page);
  });

  test("loads map canvas, supports click interaction, and matches visual baseline", async ({ page }) => {
    const mapView = new MapViewPage(page);
    await mapView.goto();
    await mapView.waitForCanvasReady();
    await mapView.clickAt(140, 110);
    await expect(page).toHaveScreenshot("map-view.png", { fullPage: true });
  });
});
