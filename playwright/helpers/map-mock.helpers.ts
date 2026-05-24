import type { Page, Route } from "@playwright/test";

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9oN7sWcAAAAASUVORK5CYII=";

function fulfillJson(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockMapLibreTileRequests(page: Page) {
  await page.route("**/*.pbf*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/x-protobuf",
      body: Buffer.from(""),
    });
  });

  await page.route("**.basemaps.cartocdn.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(TRANSPARENT_PNG_BASE64, "base64"),
    });
  });
}

type SupabaseEdgeMockOptions = {
  weeklyMovies?: Array<{ title: string; year: number; rating: number }>;
  searchLocationsByQuery?: Record<string, Array<{ lat: number; lng: number; label: string; title?: string; type?: string }>>;
};

const defaultWeeklyMovies = [
  { title: "The Last Voyage", year: 2026, rating: 7.8 },
  { title: "Aurora Nights", year: 2026, rating: 7.4 },
];

const defaultLocations = [
  { lat: 51.5074, lng: -0.1278, label: "London", title: "The Last Voyage", type: "Movie" },
  { lat: 41.9028, lng: 12.4964, label: "Rome", title: "Aurora Nights", type: "Movie" },
];

export async function mockSupabaseEdgeFunctions(page: Page, options: SupabaseEdgeMockOptions = {}) {
  await page.route("**/functions/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split("/functions/v1/")[1]?.split("/")[0];

    if (endpoint === "weekly-movies") {
      await fulfillJson(route, {
        movies: options.weeklyMovies ?? defaultWeeklyMovies,
      });
      return;
    }

    if (endpoint === "search-locations") {
      const body = (route.request().postDataJSON() as { query?: string } | null) ?? null;
      const query = body?.query?.toLowerCase() ?? "";
      const mocked = options.searchLocationsByQuery?.[query];
      await fulfillJson(route, { locations: mocked ?? defaultLocations });
      return;
    }

    if (endpoint === "title-details") {
      await fulfillJson(route, {
        locations: defaultLocations.map((location) => ({ lat: location.lat, lng: location.lng, label: location.label })),
      });
      return;
    }

    await route.continue();
  });
}
