import { haversineKm } from "@/lib/geo";
import { DAY_TRIP_RADIUS_KM, TRAIL_HUBS, type TrailHub } from "@/lib/trailHubs";

export type TrailTitleRef = { slug: string; name: string };

export type TrailStop = {
  slug: string | null;
  name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  image: string | null;
  /** Distinct source titles filmed at this stop, sorted by name. */
  titles: TrailTitleRef[];
};

export type Trail = {
  id: string;
  name: string;
  kind: "walking" | "drive";
  stops: TrailStop[];
  titleCount: number;
  totalKm: number;
  heroImage: string | null;
  country: string | null;
};

export type RawTitleLocation = {
  titleId: string;
  titleSlug: string;
  titleName: string;
  label: string;
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
};

export type LinkedSpot = {
  titleId: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
};

export type BuildTrailsOptions = {
  maxTrails?: number;
  hubs?: TrailHub[];
  dayTripRadiusKm?: number;
};

/** Stops labelled with the same city but farther than this from the group's median point are outliers. */
export const CITY_SANITY_RADIUS_KM = 30;
/** Stops within this distance are the same physical place regardless of name. */
export const DEDUP_DISTANCE_KM = 0.2;
/** Matching-name stops within this distance are variants of one place (large studio lots drift). */
export const DEDUP_NAME_MATCH_KM = 2.5;
/** Hard cap on stops per trail so routes stay followable. */
export const MAX_TRAIL_STOPS = 15;
export const CITY_TOUR_MIN_STOPS = 3;
export const DAY_TRIP_MIN_SATELLITES = 2;
/** Stops within this distance of a hub centroid belong to the hub's own city core, not its day trip. */
export const CITY_CORE_RADIUS_KM = 15;
/** Max hub-core stops used to anchor a day trip before it heads out to satellites. */
const DAY_TRIP_MAX_ANCHORS = 5;
/** Distance bucket used when capping stops, so resolved spots beat unresolved near-ties. */
const CAP_DISTANCE_BUCKET_KM = 2;

const WALKING_MAX_TOTAL_KM = 12;
const WALKING_MAX_LEG_KM = 3;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Grouping key for free-text city strings: drop anything after a comma
 * ("London, UK" → "london"), fold diacritics, lowercase, collapse whitespace.
 */
export function normalizeCityKey(city: string): string {
  return stripDiacritics(city.split(",")[0])
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kebab form of a normalized city string — the key encoded in recipe trail ids. */
export function kebabCityKey(city: string): string {
  return kebab(normalizeCityKey(city));
}

/** Kebab city/hub key encoded in a recipe id, or null if the id isn't a recipe id. */
export function trailCityKeyFromId(id: string): string | null {
  const m = /^(?:city-tour|day-trip)-(.+)$/.exec(id);
  return m ? m[1] : null;
}

function normalizeNameKey(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCaseCity(key: string): string {
  const cap = (w: string) => (w ? w[0].toUpperCase() + w.slice(1) : w);
  return key
    .split(" ")
    .map((word) => word.split("-").map(cap).join("-"))
    .join(" ");
}

type StopCandidate = {
  stop: TrailStop;
  cityKey: string;
  nameKey: string;
  /** Distinct source titles keyed by title id, unioned when stops merge. */
  titles: Map<string, TrailTitleRef>;
};

function stopDistanceKm(a: StopCandidate, b: StopCandidate): number {
  return haversineKm(a.stop.lat, a.stop.lng, b.stop.lat, b.stop.lng);
}

// ---------------------------------------------------------------------------
// Spot resolution
// ---------------------------------------------------------------------------

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Allow containment for cases like "Abbey Road Studios" vs "Abbey Road Studios, London".
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= 6 && longer.includes(shorter);
}

function citiesCompatible(a: string | null, b: string | null): boolean {
  const ka = a ? normalizeCityKey(a) : "";
  const kb = b ? normalizeCityKey(b) : "";
  if (!ka || !kb) return true;
  return ka === kb;
}

function resolveStops(raw: RawTitleLocation[], spots: LinkedSpot[]): StopCandidate[] {
  const spotsByTitle = new Map<string, LinkedSpot[]>();
  for (const s of spots) {
    const list = spotsByTitle.get(s.titleId);
    if (list) list.push(s);
    else spotsByTitle.set(s.titleId, [s]);
  }

  const out: StopCandidate[] = [];
  for (const r of raw) {
    const labelKey = normalizeNameKey(r.label);
    const linked = spotsByTitle.get(r.titleId) ?? [];
    const match = linked.find(
      (s) => namesMatch(labelKey, normalizeNameKey(s.name)) && citiesCompatible(r.city, s.city),
    );

    const lat = match?.lat ?? r.lat;
    const lng = match?.lng ?? r.lng;
    if (lat == null || lng == null) continue;

    const city = match?.city ?? r.city;
    const stop: TrailStop = match
      ? {
          slug: match.slug,
          name: match.name,
          city,
          country: match.country ?? r.country,
          lat,
          lng,
          image: match.imageUrl,
          titles: [],
        }
      : {
          slug: null,
          name: r.label,
          city,
          country: r.country,
          lat,
          lng,
          image: null,
          titles: [],
        };

    out.push({
      stop,
      cityKey: city ? normalizeCityKey(city) : "",
      nameKey: normalizeNameKey(stop.name),
      titles: new Map([[r.titleId, { slug: r.titleSlug, name: r.titleName }]]),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Generic place filter
// ---------------------------------------------------------------------------

/**
 * Locality tokens: hub keys, every stop's city key, and the trailing
 * comma-segments of every raw label / spot name — those segments are
 * cities/regions/countries by construction ("Venue, Town, Country").
 */
function buildPlaceTokens(
  raw: RawTitleLocation[],
  spots: LinkedSpot[],
  candidates: StopCandidate[],
  hubKeys: Set<string>,
): Set<string> {
  const tokens = new Set<string>();
  for (const key of hubKeys) tokens.add(normalizeNameKey(key));
  for (const c of candidates) {
    if (c.cityKey) tokens.add(normalizeNameKey(c.cityKey));
  }
  const addTrailingSegments = (label: string) => {
    const segments = label.split(",");
    for (let i = 1; i < segments.length; i++) {
      const token = normalizeNameKey(segments[i]);
      if (token) tokens.add(token);
    }
  };
  for (const r of raw) addTrailingSegments(r.label);
  for (const s of spots) addTrailingSegments(s.name);
  return tokens;
}

/**
 * A stop whose name is made up entirely of locality tokens ("London, England",
 * "Borehamwood, Hertfordshire, England") is a place, not a venue — drop it so
 * it can neither appear as a stop nor help a trail meet its threshold.
 */
function dropGenericPlaces(
  candidates: StopCandidate[],
  tokens: Set<string>,
): StopCandidate[] {
  return candidates.filter((c) => {
    const segments = c.stop.name
      .split(",")
      .map((s) => normalizeNameKey(s))
      .filter(Boolean);
    if (!segments.length) return false;
    return !segments.every((s) => tokens.has(s));
  });
}

// ---------------------------------------------------------------------------
// Cleaning: geo-sanity + dedup
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** City strings are LLM free text — coordinates are ground truth. Drop stops far from the group's median point. */
function dropGeoOutliers(group: StopCandidate[]): StopCandidate[] {
  if (group.length < 2) return group;
  const mLat = median(group.map((c) => c.stop.lat));
  const mLng = median(group.map((c) => c.stop.lng));
  return group.filter(
    (c) => haversineKm(c.stop.lat, c.stop.lng, mLat, mLng) <= CITY_SANITY_RADIUS_KM,
  );
}

/**
 * One name's words all contained in the other's ("Warner Bros. Studios
 * Leavesden, England" ⊆ "Warner Bros. Studios Leavesden, Watford, England") —
 * catches variants whose extra locality tokens defeat substring containment.
 */
function tokenSubset(a: string, b: string): boolean {
  const ta = a.split(" ");
  const tb = b.split(" ");
  const [small, large] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (small.length < 2 || small.join(" ").length < 6) return false;
  const largeSet = new Set(large);
  return small.every((t) => largeSet.has(t));
}

function sameStop(a: StopCandidate, b: StopCandidate): boolean {
  if (b.stop.slug != null && a.stop.slug === b.stop.slug) return true;
  const d = stopDistanceKm(a, b);
  if (d <= DEDUP_DISTANCE_KM) return true;
  return (
    d <= DEDUP_NAME_MATCH_KM &&
    (namesMatch(a.nameKey, b.nameKey) || tokenSubset(a.nameKey, b.nameKey))
  );
}

function dedupCandidates(group: StopCandidate[]): StopCandidate[] {
  const merged: StopCandidate[] = [];
  for (const cand of group) {
    const existing = merged.find((m) => sameStop(m, cand));
    if (!existing) {
      // Clone so re-deduping hub-wide collections never mutates the per-city groups.
      merged.push({ ...cand, stop: { ...cand.stop }, titles: new Map(cand.titles) });
      continue;
    }
    for (const [id, ref] of cand.titles) existing.titles.set(id, ref);
    // Resolved slug wins; among unresolved variants the shortest label is cleanest.
    const a = existing.stop;
    const b = cand.stop;
    let base = a;
    let other = b;
    if (b.slug && !a.slug) {
      base = b;
      other = a;
    } else if (!a.slug && !b.slug && b.name.length < a.name.length) {
      base = b;
      other = a;
    }
    existing.stop = { ...base, image: base.image ?? other.image };
    existing.nameKey = normalizeNameKey(existing.stop.name);
  }
  return merged;
}

type CleanedStops = {
  byCity: Map<string, StopCandidate[]>;
  cityless: StopCandidate[];
};

function groupAndClean(candidates: StopCandidate[]): CleanedStops {
  const byCity = new Map<string, StopCandidate[]>();
  const cityless: StopCandidate[] = [];
  for (const c of candidates) {
    if (!c.cityKey) {
      cityless.push(c);
      continue;
    }
    const list = byCity.get(c.cityKey);
    if (list) list.push(c);
    else byCity.set(c.cityKey, [c]);
  }
  for (const [key, group] of byCity) {
    byCity.set(key, dedupCandidates(dropGeoOutliers(group)));
  }
  return { byCity, cityless: dedupCandidates(cityless) };
}

// ---------------------------------------------------------------------------
// Trail assembly
// ---------------------------------------------------------------------------

function orderByProximity(cands: StopCandidate[]): { ordered: StopCandidate[]; totalKm: number } {
  if (cands.length <= 1) return { ordered: cands, totalKm: 0 };
  const remaining = [...cands];
  let current = remaining.reduce((a, b) => (a.stop.lng < b.stop.lng ? a : b));
  remaining.splice(remaining.indexOf(current), 1);
  const ordered = [current];
  let totalKm = 0;
  while (remaining.length) {
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = stopDistanceKm(current, remaining[i]);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    totalKm += bestD;
    current = remaining[bestIdx];
    ordered.push(current);
    remaining.splice(bestIdx, 1);
  }
  return { ordered, totalKm };
}

function assembleTrail(
  id: string,
  name: string,
  cands: StopCandidate[],
  forceKind?: "drive",
): Trail {
  const { ordered, totalKm } = orderByProximity(cands);
  const legs = ordered.slice(1).map((c, i) => stopDistanceKm(ordered[i], c));
  const maxLeg = legs.length ? Math.max(...legs) : 0;
  const kind: Trail["kind"] =
    forceKind ?? (totalKm <= WALKING_MAX_TOTAL_KM && maxLeg <= WALKING_MAX_LEG_KM ? "walking" : "drive");

  const titleIds = new Set<string>();
  for (const c of ordered) for (const id of c.titles.keys()) titleIds.add(id);

  const countries = Array.from(
    new Set(ordered.map((c) => c.stop.country).filter((c): c is string => !!c)),
  );

  const stops = ordered.map((c) => ({
    ...c.stop,
    titles: Array.from(c.titles.values()).sort(
      (a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug),
    ),
  }));
  return {
    id,
    name,
    kind,
    stops,
    titleCount: titleIds.size,
    totalKm,
    heroImage: stops.find((s) => s.image)?.image ?? null,
    country: countries.length === 1 ? countries[0] : null,
  };
}

/**
 * Cap a candidate list to the `limit` nearest stops, but within coarse distance
 * buckets let resolved stops (slug → deep link + image) beat unresolved near-ties.
 */
function nearestPreferResolved(
  cands: StopCandidate[],
  lat: number,
  lng: number,
  limit: number,
): StopCandidate[] {
  if (limit <= 0) return [];
  return cands
    .map((c) => ({ c, d: haversineKm(c.stop.lat, c.stop.lng, lat, lng) }))
    .sort((a, b) => {
      const bucket =
        Math.floor(a.d / CAP_DISTANCE_BUCKET_KM) - Math.floor(b.d / CAP_DISTANCE_BUCKET_KM);
      if (bucket) return bucket;
      const resolved = Number(!!b.c.stop.slug) - Number(!!a.c.stop.slug);
      if (resolved) return resolved;
      return a.d - b.d || a.c.nameKey.localeCompare(b.c.nameKey);
    })
    .slice(0, limit)
    .map((x) => x.c);
}

function buildCityTours(cleaned: CleanedStops, hubKeys: Set<string>): Trail[] {
  const trails: Trail[] = [];
  for (const [key, group] of cleaned.byCity) {
    // Hub cities are built geo-first in buildHubTrails; the hub version owns the id.
    if (hubKeys.has(key)) continue;
    if (group.length < CITY_TOUR_MIN_STOPS) continue;
    const mLat = median(group.map((c) => c.stop.lat));
    const mLng = median(group.map((c) => c.stop.lng));
    const capped = nearestPreferResolved(group, mLat, mLng, MAX_TRAIL_STOPS);
    trails.push(
      assembleTrail(`city-tour-${kebab(key)}`, `${titleCaseCity(key)} City Tour`, capped),
    );
  }
  return trails;
}

type HubSplit = { core: StopCandidate[]; satellites: StopCandidate[] };

/**
 * Geo-first split: most stops have no city label, so distance from the hub
 * centroid — not the city string — decides core vs satellite. Stops labelled
 * with a *different* hub's city never count as satellites.
 */
function splitAroundHub(
  cleaned: CleanedStops,
  hub: TrailHub,
  hubKeys: Set<string>,
  radiusKm: number,
): HubSplit {
  const core: StopCandidate[] = [];
  const satellites: StopCandidate[] = [];
  const consider = (c: StopCandidate) => {
    const d = haversineKm(c.stop.lat, c.stop.lng, hub.lat, hub.lng);
    if (d <= CITY_CORE_RADIUS_KM) {
      core.push(c);
    } else if (d <= radiusKm && !(c.cityKey && c.cityKey !== hub.key && hubKeys.has(c.cityKey))) {
      satellites.push(c);
    }
  };
  for (const group of cleaned.byCity.values()) for (const c of group) consider(c);
  for (const c of cleaned.cityless) consider(c);
  // Core/satellite sets cross city groups, so dedup again (dedupCandidates clones).
  return { core: dedupCandidates(core), satellites: dedupCandidates(satellites) };
}

function buildHubTrails(cleaned: CleanedStops, hubs: TrailHub[], radiusKm: number): Trail[] {
  const hubKeys = new Set(hubs.map((h) => h.key));
  const trails: Trail[] = [];
  for (const hub of hubs) {
    const { core, satellites } = splitAroundHub(cleaned, hub, hubKeys, radiusKm);

    if (core.length >= CITY_TOUR_MIN_STOPS) {
      trails.push(
        assembleTrail(
          `city-tour-${kebab(hub.key)}`,
          `${hub.name} City Tour`,
          nearestPreferResolved(core, hub.lat, hub.lng, MAX_TRAIL_STOPS),
        ),
      );
    }

    // A day trip needs genuine out-of-town stops; core-only hubs are just city tours.
    if (satellites.length >= DAY_TRIP_MIN_SATELLITES) {
      const keptSatellites = nearestPreferResolved(satellites, hub.lat, hub.lng, MAX_TRAIL_STOPS);
      const anchorSlots = Math.min(DAY_TRIP_MAX_ANCHORS, MAX_TRAIL_STOPS - keptSatellites.length);
      const anchors = nearestPreferResolved(core, hub.lat, hub.lng, anchorSlots);
      // Anchors and satellites straddling the core boundary can still be the same place.
      trails.push(
        assembleTrail(
          `day-trip-${kebab(hub.key)}`,
          `Day Trip from ${hub.name}`,
          dedupCandidates([...anchors, ...keptSatellites]),
          "drive",
        ),
      );
    }
  }
  return trails;
}

function buildAllTrails(
  raw: RawTitleLocation[],
  spots: LinkedSpot[],
  options?: BuildTrailsOptions,
): Trail[] {
  const hubs = options?.hubs ?? TRAIL_HUBS;
  const radiusKm = options?.dayTripRadiusKm ?? DAY_TRIP_RADIUS_KM;
  const hubKeys = new Set(hubs.map((h) => h.key));
  const resolved = resolveStops(raw, spots);
  const tokens = buildPlaceTokens(raw, spots, resolved, hubKeys);
  const cleaned = groupAndClean(dropGenericPlaces(resolved, tokens));
  const trails = [...buildCityTours(cleaned, hubKeys), ...buildHubTrails(cleaned, hubs, radiusKm)];
  trails.sort(
    (a, b) =>
      b.titleCount - a.titleCount || b.stops.length - a.stops.length || a.id.localeCompare(b.id),
  );
  return trails;
}

export function buildTrails(
  raw: RawTitleLocation[],
  spots: LinkedSpot[],
  options?: BuildTrailsOptions,
): Trail[] {
  return buildAllTrails(raw, spots, options).slice(0, options?.maxTrails ?? 4);
}

/**
 * Resolve a recipe id (`city-tour-<city>` / `day-trip-<hub>`) to its trail,
 * independent of whether it ranks into the homepage's top N.
 */
export function buildTrailById(
  id: string,
  raw: RawTitleLocation[],
  spots: LinkedSpot[],
  options?: BuildTrailsOptions,
): Trail | null {
  return buildAllTrails(raw, spots, options).find((t) => t.id === id) ?? null;
}
