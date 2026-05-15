// Shared image-resolution helpers.
// Goal: deterministic, source-of-truth images for titles (TMDB / OpenLibrary)
// and locations (Wikipedia strict / Wikidata-by-coords / satellite static fallback).

const TMDB_IMG = "https://image.tmdb.org/t/p/";

const withTimeout = (ms: number) => AbortSignal.timeout(ms);

async function safeFetchJson<T = any>(url: string, ms = 4000): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: withTimeout(ms) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// ---------- TITLES ----------

export type TitleType = "Movie" | "Series" | "Book";

export interface TitleImageResult {
  poster: string | null;
  backdrop: string | null;
  source: "tmdb" | "openlibrary" | "wikipedia" | "none";
}

export async function getTmdbImage(
  title: string,
  year?: number,
  type?: TitleType
): Promise<TitleImageResult | null> {
  const apiKey = Deno.env.get("TMDB_API_KEY");
  if (!apiKey || !title) return null;

  const kinds: Array<"movie" | "tv"> =
    type === "Series" ? ["tv", "movie"] : ["movie", "tv"];

  for (const kind of kinds) {
    const url = new URL(`https://api.themoviedb.org/3/search/${kind}`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", title);
    url.searchParams.set("include_adult", "false");
    if (year) {
      url.searchParams.set(
        kind === "movie" ? "year" : "first_air_date_year",
        String(year)
      );
    }
    const data = await safeFetchJson<{ results?: any[] }>(url.toString());
    const results = Array.isArray(data?.results) ? data!.results! : [];
    if (results.length === 0) continue;

    // Score by year proximity + popularity
    const scored = results
      .filter((r) => r.poster_path || r.backdrop_path)
      .map((r) => {
        const date = r.release_date || r.first_air_date || "";
        const ry = Number(date.slice(0, 4)) || 0;
        const yearDelta = year && ry ? Math.abs(ry - year) : 5;
        const score = (r.popularity || 0) - yearDelta * 20;
        return { r, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0]?.r;
    if (!best) continue;

    return {
      poster: best.poster_path ? `${TMDB_IMG}w500${best.poster_path}` : null,
      backdrop: best.backdrop_path
        ? `${TMDB_IMG}w1280${best.backdrop_path}`
        : best.poster_path
        ? `${TMDB_IMG}w780${best.poster_path}`
        : null,
      source: "tmdb",
    };
  }
  return null;
}

export async function getOpenLibraryCover(
  title: string,
  author?: string
): Promise<string | null> {
  if (!title) return null;
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("title", title);
  if (author) url.searchParams.set("author", author);
  url.searchParams.set("limit", "5");
  const data = await safeFetchJson<{ docs?: any[] }>(url.toString());
  const doc = (data?.docs || []).find((d) => d.cover_i);
  if (!doc?.cover_i) return null;
  return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
}

// Strict Wikipedia: returns image only if first opensearch hit closely matches the requested title.
export async function getWikipediaImageStrict(
  query: string,
  mustContain?: string
): Promise<string | null> {
  if (!query) return null;
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&origin=*&search=${encodeURIComponent(
    query
  )}`;
  const arr = await safeFetchJson<any[]>(searchUrl);
  const pageTitle: string | undefined = arr?.[1]?.[0];
  if (!pageTitle) return null;
  const needle = (mustContain || query).toLowerCase().split(/\s+/)[0];
  if (needle && !pageTitle.toLowerCase().includes(needle)) return null;
  const summary = await safeFetchJson<any>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      pageTitle.replace(/ /g, "_")
    )}`
  );
  return (
    summary?.originalimage?.source ||
    summary?.thumbnail?.source ||
    null
  );
}

export async function resolveTitleImage(opts: {
  title: string;
  year?: number;
  type?: TitleType;
  author?: string;
}): Promise<{ coverImage: string | null; backdropImage: string | null }> {
  const { title, year, type, author } = opts;

  if (type === "Book") {
    const cover = await getOpenLibraryCover(title, author);
    if (cover) return { coverImage: cover, backdropImage: cover };
    const wiki = await getWikipediaImageStrict(`${title} novel`, title);
    return { coverImage: wiki, backdropImage: wiki };
  }

  const tmdb = await getTmdbImage(title, year, type);
  if (tmdb) {
    return { coverImage: tmdb.poster, backdropImage: tmdb.backdrop };
  }

  const wiki = await getWikipediaImageStrict(
    `${title} ${type === "Series" ? "TV series" : "film"}`,
    title
  );
  return { coverImage: wiki, backdropImage: wiki };
}

// ---------- LOCATIONS ----------

// Wikipedia geosearch — find nearby pages with images.
async function getWikipediaImageByCoords(
  lat: number,
  lng: number,
  radiusMeters = 500
): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggsradius=${radiusMeters}&ggslimit=5&ggscoord=${lat}|${lng}&prop=pageimages&piprop=original|thumbnail&pithumbsize=1280`;
  const data = await safeFetchJson<any>(url);
  const pages: any[] = Object.values(data?.query?.pages || {});
  for (const p of pages) {
    const img = p?.original?.source || p?.thumbnail?.source;
    if (img) return img;
  }
  return null;
}

// Wikidata: image (P18) for nearest entity at coords.
async function getWikidataImageByCoords(
  lat: number,
  lng: number,
  radiusKm = 0.2
): Promise<string | null> {
  const sparql = `
    SELECT ?item ?image WHERE {
      SERVICE wikibase:around {
        ?item wdt:P625 ?location .
        bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "${radiusKm}" .
      }
      ?item wdt:P18 ?image .
    } LIMIT 1`;
  try {
    const r = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
      {
        headers: { Accept: "application/sparql-results+json", "User-Agent": "sarevista/1.0" },
        signal: withTimeout(4000),
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const img = data?.results?.bindings?.[0]?.image?.value;
    return img || null;
  } catch {
    return null;
  }
}

// Public satellite tile static image (no auth required).
function getSatelliteStatic(lat: number, lng: number, zoom = 17): string {
  // ArcGIS World Imagery — public REST export endpoint.
  const delta = 0.003 / Math.pow(2, zoom - 17); // small bbox around point
  const xmin = lng - delta;
  const xmax = lng + delta;
  const ymin = lat - delta * 0.6;
  const ymax = lat + delta * 0.6;
  return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${xmin},${ymin},${xmax},${ymax}&bboxSR=4326&imageSR=3857&size=1280,720&format=jpg&f=image`;
}

// Mapbox static if token configured.
function getMapboxStatic(lat: number, lng: number, zoom = 15): string | null {
  const token = Deno.env.get("MAPBOX_TOKEN");
  if (!token) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},${zoom},0/1280x720@2x?access_token=${token}`;
}

export async function resolveLocationImage(opts: {
  name?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  kind?: "city" | "spot";
}): Promise<string> {
  const { name, city, country, lat, lng, kind = "spot" } = opts;

  // 1) Strict Wikipedia by name (works great for cities and famous landmarks)
  const queries: string[] = [];
  if (name && city && name !== city) queries.push(`${name} ${city}`);
  if (name) queries.push(name);
  if (kind === "city" && city && country) queries.push(`${city} ${country}`);
  if (kind === "city" && city) queries.push(city);

  for (const q of queries) {
    const img = await getWikipediaImageStrict(q, name || city);
    if (img) return img;
  }

  // 2) Coordinate-based lookup for spots
  if (typeof lat === "number" && typeof lng === "number") {
    const wd = await getWikidataImageByCoords(lat, lng, 0.3);
    if (wd) return wd;
    const wp = await getWikipediaImageByCoords(lat, lng, 500);
    if (wp) return wp;

    // 3) Guaranteed: satellite static map of the actual coordinates
    return getMapboxStatic(lat, lng, kind === "city" ? 12 : 17) || getSatelliteStatic(lat, lng, kind === "city" ? 12 : 17);
  }

  // Final fallback: a neutral placeholder
  return "/placeholder.svg";
}
