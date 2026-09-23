import type { MediaType } from "@/lib/mockData";

/** Loose shape of a location entry inside `titles.data`. */
export type RawTitleLocation = {
  label?: string;
  name?: string;
  city?: string;
  country?: string;
  lat?: unknown;
  lng?: unknown;
  image?: string;
  image_url?: string;
};

export function normalizeMediaType(t: unknown): MediaType {
  if (t === "Movie" || t === "Series" || t === "Book") return t;
  return "Movie";
}

export function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toLocationArray(data: unknown): RawTitleLocation[] {
  if (!data || typeof data !== "object") return [];
  const p = data as Record<string, unknown>;
  for (const v of [p.locations, p.spots, p.pins]) {
    if (Array.isArray(v)) {
      return v.filter((x): x is RawTitleLocation => Boolean(x && typeof x === "object"));
    }
  }
  return [];
}
