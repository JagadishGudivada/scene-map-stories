import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TrailStop = {
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  image: string | null;
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

type LocRow = {
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  hero_image_url: string | null;
};

type TitleRow = { title: string; data: unknown };

const R = 6371;
const toRad = (n: number) => (n * Math.PI) / 180;
function haversineKm(a: TrailStop, b: TrailStop) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Greedy nearest-neighbour ordering starting from the westernmost stop.
function orderByProximity(stops: TrailStop[]): { ordered: TrailStop[]; totalKm: number } {
  if (stops.length <= 1) return { ordered: stops, totalKm: 0 };
  const remaining = [...stops];
  let current = remaining.reduce((a, b) => (a.lng < b.lng ? a : b));
  remaining.splice(remaining.indexOf(current), 1);
  const ordered = [current];
  let totalKm = 0;
  while (remaining.length) {
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
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

// Cluster locations greedily: pick the point with the most neighbours within radiusKm,
// take up to maxStops nearest, remove and repeat.
function clusterByProximity(stops: TrailStop[], radiusKm: number, maxStops: number): TrailStop[][] {
  const remaining = new Set(stops);
  const clusters: TrailStop[][] = [];
  while (remaining.size) {
    const arr = [...remaining];
    let seed = arr[0];
    let seedNeighbours: TrailStop[] = [];
    for (const p of arr) {
      const neighbours = arr.filter((q) => q !== p && haversineKm(p, q) <= radiusKm);
      if (neighbours.length > seedNeighbours.length) {
        seed = p;
        seedNeighbours = neighbours;
      }
    }
    const withDist = seedNeighbours
      .map((q) => ({ q, d: haversineKm(seed, q) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, maxStops - 1)
      .map((x) => x.q);
    const cluster = [seed, ...withDist];
    for (const p of cluster) remaining.delete(p);
    clusters.push(cluster);
  }
  return clusters;
}

function extractCitiesFromTitleData(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const arr = (data as Record<string, unknown>).locations;
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const loc of arr) {
    if (loc && typeof loc === "object") {
      const c = (loc as Record<string, unknown>).city;
      if (typeof c === "string" && c.trim()) out.push(c.trim().toLowerCase());
    }
  }
  return out;
}

function slugifyTrail(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function useTrails(maxTrails = 4) {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: locData }, { data: titleData }] = await Promise.all([
          supabase
            .from("locations")
            .select("slug, name, city, country, lat, lng, hero_image_url")
            .not("lat", "is", null)
            .not("lng", "is", null),
          supabase.from("titles").select("title, data").limit(1000),
        ]);

        const stops: TrailStop[] = ((locData ?? []) as LocRow[])
          .filter((r) => r.lat != null && r.lng != null)
          .map((r) => ({
            slug: r.slug,
            name: r.name,
            city: r.city,
            country: r.country,
            lat: r.lat as number,
            lng: r.lng as number,
            image: r.hero_image_url,
          }));

        // Index titles by referenced city (lowercase).
        const cityToTitles = new Map<string, Set<string>>();
        for (const t of (titleData ?? []) as TitleRow[]) {
          for (const c of extractCitiesFromTitleData(t.data)) {
            let set = cityToTitles.get(c);
            if (!set) {
              set = new Set();
              cityToTitles.set(c, set);
            }
            set.add(t.title);
          }
        }

        // Cluster with a generous radius so we still get regional trails
        // even when the DB is sparse.
        const clusters = clusterByProximity(stops, 800, 15).filter((c) => c.length >= 2);

        // Sort clusters by size, then by pairwise density.
        clusters.sort((a, b) => b.length - a.length);

        const built: Trail[] = clusters.slice(0, maxTrails).map((cluster, idx) => {
          const { ordered, totalKm } = orderByProximity(cluster);
          // Walking if the whole ordered path fits in ~12 km AND every leg is short.
          const legs = ordered.slice(1).map((s, i) => haversineKm(ordered[i], s));
          const maxLeg = legs.length ? Math.max(...legs) : 0;
          const kind: Trail["kind"] =
            totalKm <= 12 && maxLeg <= 3 ? "walking" : "drive";

          const titles = new Set<string>();
          for (const s of ordered) {
            const key = (s.city ?? "").trim().toLowerCase();
            const set = key ? cityToTitles.get(key) : undefined;
            if (set) for (const t of set) titles.add(t);
          }

          const countries = Array.from(
            new Set(ordered.map((s) => s.country).filter((c): c is string => !!c)),
          );
          const region =
            countries.length === 1
              ? countries[0]
              : ordered[0].city
                ? `${ordered[0].city} & Beyond`
                : "Region";
          const name =
            kind === "walking"
              ? `${ordered[0].city ?? region} Walking Trail`
              : `${region} One-Day Drive`;

          return {
            id: slugifyTrail(`${name}-${idx}`),
            name,
            kind,
            stops: ordered,
            titleCount: titles.size,
            totalKm,
            heroImage: ordered.find((s) => s.image)?.image ?? null,
            country: countries[0] ?? null,
          };
        });

        if (!cancelled) {
          setTrails(built);
          setLoading(false);
        }
      } catch (e) {
        console.error("useTrails error", e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [maxTrails]);

  return { trails, loading };
}
