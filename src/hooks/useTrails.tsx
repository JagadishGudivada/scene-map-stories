import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildTrailById,
  buildTrails,
  kebabCityKey,
  trailCityKeyFromId,
  type LinkedSpot,
  type RawTitleLocation,
  type Trail,
  type TrailStop,
} from "@/lib/trails";

export type { Trail, TrailStop };

const PAGE_SIZE = 1000;

type TitleRow = {
  id: string;
  slug: string;
  title: string;
  locations: unknown;
};

type TitleSpotRow = {
  title_id: string;
  spots: {
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    lat: number | null;
    lng: number | null;
    image_url: string | null;
  } | null;
};

type LocationImageRow = {
  city: string | null;
  hero_image_url: string | null;
};

function toNumberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function toStringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

// titles.data->locations is untyped JSON written by AI enrichment — validate every field.
function parseRawLocations(row: TitleRow): RawTitleLocation[] {
  if (!Array.isArray(row.locations)) return [];
  const out: RawTitleLocation[] = [];
  for (const loc of row.locations) {
    if (!loc || typeof loc !== "object") continue;
    const rec = loc as Record<string, unknown>;
    const label = toStringOrNull(rec.label);
    if (!label) continue;
    out.push({
      titleId: row.id,
      titleSlug: row.slug,
      titleName: row.title,
      label,
      lat: toNumberOrNull(rec.lat),
      lng: toNumberOrNull(rec.lng),
      city: toStringOrNull(rec.city),
      country: toStringOrNull(rec.country),
    });
  }
  return out;
}

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

type TrailSourceData = {
  raw: RawTitleLocation[];
  spots: LinkedSpot[];
  /** City hero images from the locations table, keyed by kebab city key. */
  cityImages: Record<string, string>;
};

async function fetchTrailSourceData(): Promise<TrailSourceData> {
  const [titleRows, titleSpotRows, locationRows] = await Promise.all([
    fetchAllPages<TitleRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("titles")
        .select("id, slug, title, locations:data->locations")
        .order("id")
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as unknown as TitleRow[];
    }),
    fetchAllPages<TitleSpotRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("title_spots")
        .select("title_id, spots(slug, name, city, country, lat, lng, image_url)")
        .order("id")
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as unknown as TitleSpotRow[];
    }),
    fetchAllPages<LocationImageRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("locations")
        .select("city, hero_image_url")
        .not("city", "is", null)
        .not("hero_image_url", "is", null)
        .order("id")
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as LocationImageRow[];
    }),
  ]);

  const raw = titleRows.flatMap(parseRawLocations);
  const spots: LinkedSpot[] = [];
  for (const row of titleSpotRows) {
    const s = row.spots;
    if (!s) continue;
    spots.push({
      titleId: row.title_id,
      slug: s.slug,
      name: s.name,
      city: s.city,
      country: s.country,
      lat: s.lat,
      lng: s.lng,
      imageUrl: s.image_url,
    });
  }

  const cityImages: Record<string, string> = {};
  for (const row of locationRows) {
    if (!row.city || !row.hero_image_url) continue;
    const key = kebabCityKey(row.city);
    if (key && !(key in cityImages)) cityImages[key] = row.hero_image_url;
  }

  return { raw, spots, cityImages };
}

/** Most stops resolve to no spot image; fall back to the city's hero image for the card. */
function withHeroFallback(trail: Trail, cityImages: Record<string, string>): Trail {
  if (trail.heroImage) return trail;
  const key = trailCityKeyFromId(trail.id);
  const image = key ? cityImages[key] : undefined;
  return image ? { ...trail, heroImage: image } : trail;
}

function useTrailSourceData() {
  return useQuery<TrailSourceData>({
    queryKey: ["trails-source-data"],
    queryFn: async () => {
      try {
        return await fetchTrailSourceData();
      } catch (e) {
        console.error("useTrails error", e);
        return { raw: [], spots: [], cityImages: {} };
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrails(maxTrails = 4): { trails: Trail[]; loading: boolean } {
  const { data, isLoading } = useTrailSourceData();
  const trails = useMemo(
    () =>
      data
        ? buildTrails(data.raw, data.spots, { maxTrails }).map((t) =>
            withHeroFallback(t, data.cityImages),
          )
        : [],
    [data, maxTrails],
  );
  return { trails, loading: isLoading };
}

export function useTrailById(id: string | undefined): { trail: Trail | null; loading: boolean } {
  const { data, isLoading } = useTrailSourceData();
  const trail = useMemo(() => {
    if (!data || !id) return null;
    const built = buildTrailById(id, data.raw, data.spots);
    return built ? withHeroFallback(built, data.cityImages) : null;
  }, [data, id]);
  return { trail, loading: isLoading };
}
