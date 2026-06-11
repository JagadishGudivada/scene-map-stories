import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MapPin } from "@/components/LeafletMap";
import type { MediaType } from "@/lib/mockData";

type RawLoc = {
  label?: string;
  name?: string;
  city?: string;
  country?: string;
  lat?: unknown;
  lng?: unknown;
  image?: string;
  image_url?: string;
};

function normalizeMediaType(t: unknown): MediaType {
  if (t === "Movie" || t === "Series" || t === "Book") return t;
  return "Movie";
}

function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toLocArray(data: unknown): RawLoc[] {
  if (!data || typeof data !== "object") return [];
  const p = data as Record<string, unknown>;
  for (const v of [p.locations, p.spots, p.pins]) {
    if (Array.isArray(v)) {
      return v.filter((x): x is RawLoc => Boolean(x && typeof x === "object"));
    }
  }
  return [];
}

const MERGE_DISTANCE_KM = 0.15;
const SPATIAL_BUCKET_DEGREES = 0.002;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function bucketIndex(value: number) {
  return Math.floor(value / SPATIAL_BUCKET_DEGREES);
}

function bucketKey(lat: number, lng: number) {
  return `${bucketIndex(lat)}:${bucketIndex(lng)}`;
}

function nearbyBucketKeys(lat: number, lng: number) {
  const latIdx = bucketIndex(lat);
  const lngIdx = bucketIndex(lng);
  const keys: string[] = [];

  for (let dLat = -1; dLat <= 1; dLat += 1) {
    for (let dLng = -1; dLng <= 1; dLng += 1) {
      keys.push(`${latIdx + dLat}:${lngIdx + dLng}`);
    }
  }

  return keys;
}

function mergePin(existing: MapPin, incoming: MapPin): MapPin {
  const titles = new Set<string>(existing.titles ?? (existing.title ? [existing.title] : []));
  if (incoming.title) titles.add(incoming.title);
  for (const t of incoming.titles ?? []) titles.add(t);

  // Prefer richer source: spot > location > title > ai
  const rank = { spot: 3, location: 2, title: 1, ai: 0 } as const;
  const prefer = (rank[incoming.source ?? "ai"] ?? 0) > (rank[existing.source ?? "ai"] ?? 0)
    ? incoming
    : existing;

  return {
    ...prefer,
    lat: existing.lat,
    lng: existing.lng,
    titles: Array.from(titles),
    title: prefer.title ?? existing.title ?? incoming.title,
    image: prefer.image ?? existing.image ?? incoming.image,
    city: prefer.city ?? existing.city ?? incoming.city,
    country: prefer.country ?? existing.country ?? incoming.country,
  };
}

function findNearbyPinKey(
  pins: Map<string, MapPin>,
  buckets: Map<string, string[]>,
  pin: MapPin,
) {
  let bestKey: string | null = null;
  let bestDistance = Infinity;

  for (const key of nearbyBucketKeys(pin.lat, pin.lng)) {
    for (const candidateKey of buckets.get(key) ?? []) {
      const candidate = pins.get(candidateKey);
      if (!candidate) continue;

      const distance = haversineKm(candidate.lat, candidate.lng, pin.lat, pin.lng);
      if (distance <= MERGE_DISTANCE_KM && distance < bestDistance) {
        bestDistance = distance;
        bestKey = candidateKey;
      }
    }
  }

  return bestKey;
}

function addPin(
  pins: Map<string, MapPin>,
  buckets: Map<string, string[]>,
  pin: MapPin,
) {
  const existingKey = findNearbyPinKey(pins, buckets, pin);
  if (existingKey) {
    const existing = pins.get(existingKey);
    if (existing) pins.set(existingKey, mergePin(existing, pin));
    return;
  }

  const key = `${pin.lat.toFixed(6)}:${pin.lng.toFixed(6)}:${pins.size}`;
  pins.set(key, pin);

  const cell = bucketKey(pin.lat, pin.lng);
  const existingBucket = buckets.get(cell);
  if (existingBucket) {
    existingBucket.push(key);
  } else {
    buckets.set(cell, [key]);
  }
}

export function useConsolidatedMapPins() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const merged = new Map<string, MapPin>();
    const spatialBuckets = new Map<string, string[]>();

    const commit = () => {
      if (!cancelled) setPins(Array.from(merged.values()));
    };

    const loadLocations = async () => {
      const { data } = await supabase
        .from("locations")
        .select("slug, name, city, country, lat, lng, hero_image_url")
        .not("lat", "is", null)
        .not("lng", "is", null);
      for (const row of data ?? []) {
        const lat = toNum(row.lat), lng = toNum(row.lng);
        if (lat === null || lng === null) continue;
        const label = (row.name?.trim() || [row.city, row.country].filter(Boolean).join(", ")) as string;
        if (!label) continue;
        addPin(merged, spatialBuckets, {
          lat, lng, label,
          city: row.city ?? undefined,
          country: row.country ?? undefined,
          type: "Movie",
          image: row.hero_image_url ?? undefined,
          source: "location",
          slug: row.slug ?? undefined,
        });
      }
    };

    const loadSpots = async () => {
      const { data } = await supabase
        .from("spots")
        .select("slug, name, city, country, lat, lng, image_url")
        .not("lat", "is", null)
        .not("lng", "is", null);
      for (const row of data ?? []) {
        const lat = toNum(row.lat), lng = toNum(row.lng);
        if (lat === null || lng === null) continue;
        const label = (row.name?.trim() || [row.city, row.country].filter(Boolean).join(", ")) as string;
        if (!label) continue;
        addPin(merged, spatialBuckets, {
          lat, lng, label,
          city: row.city ?? undefined,
          country: row.country ?? undefined,
          type: "Movie",
          image: row.image_url ?? undefined,
          source: "spot",
          slug: row.slug ?? undefined,
        });
      }
    };

    const loadTitles = async () => {
      const batchSize = 300;
      for (let offset = 0; !cancelled; offset += batchSize) {
        const { data, error } = await supabase
          .from("titles")
          .select("slug, title, type, poster_url, backdrop_url, data")
          .order("created_at", { ascending: false })
          .range(offset, offset + batchSize - 1);
        if (error || !data || !data.length) break;
        for (const row of data) {
          const type = normalizeMediaType(row.type);
          for (const loc of toLocArray(row.data)) {
            const lat = toNum(loc.lat), lng = toNum(loc.lng);
            if (lat === null || lng === null) continue;
            const label =
              (typeof loc.label === "string" && loc.label.trim()) ||
              (typeof loc.name === "string" && loc.name.trim()) ||
              [loc.city, loc.country].filter(Boolean).join(", ") ||
              row.title;
            if (!label) continue;
            addPin(merged, spatialBuckets, {
              lat, lng, label,
              title: row.title,
              type,
              city: typeof loc.city === "string" ? loc.city : undefined,
              country: typeof loc.country === "string" ? loc.country : undefined,
              image:
                (typeof loc.image_url === "string" && loc.image_url) ||
                (typeof loc.image === "string" && loc.image) ||
                row.poster_url ||
                row.backdrop_url ||
                undefined,
              source: "title",
            });
          }
        }
        // Stream progressive results to the map.
        commit();
        if (data.length < batchSize) break;
      }
    };

    (async () => {
      try {
        // Load canonical sources first (small, fast) then titles in background.
        await Promise.all([loadLocations(), loadSpots()]);
        commit();
        if (!cancelled) setLoading(false);
        await loadTitles();
        commit();
      } catch (err) {
        console.error("useConsolidatedMapPins error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { pins, loading };
}
