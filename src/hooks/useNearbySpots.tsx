import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MapPin } from "@/components/LeafletMap";
import type { MediaType } from "@/lib/mockData";

type TitleDataLocation = {
  label?: string;
  name?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  image?: string;
  image_url?: string;
};

interface TitleRow {
  id: string;
  slug: string;
  title: string;
  type: string;
  poster_url: string | null;
  backdrop_url: string | null;
  data: unknown;
}

interface NearbyPin extends MapPin {
  titleSlug?: string;
  distanceKm: number;
}

function normalizeMediaType(type: string | null | undefined): MediaType {
  if (type === "Movie" || type === "Series" || type === "Book") return type;
  return "Movie";
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toLocationArray(data: unknown): TitleDataLocation[] {
  if (!data || typeof data !== "object") return [];
  const payload = data as Record<string, unknown>;
  const candidates = [payload.locations, payload.spots, payload.pins];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value.filter((item): item is TitleDataLocation => Boolean(item && typeof item === "object"));
    }
  }

  return [];
}

function mapTitleRowToPins(row: TitleRow): NearbyPin[] {
  const type = normalizeMediaType(row.type);
  const locations = toLocationArray(row.data);
  const pins: NearbyPin[] = [];

  for (const loc of locations) {
    const lat = toNumber(loc.lat);
    const lng = toNumber(loc.lng);
    if (lat === null || lng === null) continue;

    const label =
      (typeof loc.label === "string" && loc.label.trim()) ||
      (typeof loc.name === "string" && loc.name.trim()) ||
      [loc.city, loc.country].filter(Boolean).join(", ") ||
      row.title;

    pins.push({
      lat,
      lng,
      label,
      title: row.title,
      titleSlug: row.slug,
      city: typeof loc.city === "string" ? loc.city : undefined,
      country: typeof loc.country === "string" ? loc.country : undefined,
      type,
      image:
        (typeof loc.image_url === "string" && loc.image_url) ||
        (typeof loc.image === "string" && loc.image) ||
        row.poster_url ||
        row.backdrop_url ||
        undefined,
      distanceKm: 0,
    });
  }

  return pins;
}

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

export function useNearbySpots(
  center: { lat: number; lng: number } | null,
  radiusKm: number,
  enabled: boolean
) {
  const [allSpots, setAllSpots] = useState<NearbyPin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (allSpots.length > 0) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const collected: NearbyPin[] = [];
        const seen = new Set<string>();
        const batchSize = 200;

        for (let offset = 0; !cancelled; offset += batchSize) {
          const { data, error } = await supabase
            .from("titles")
            .select("id, slug, title, type, poster_url, backdrop_url, data")
            .order("created_at", { ascending: false })
            .range(offset, offset + batchSize - 1);

          if (error) throw error;

          const rows = (data || []) as TitleRow[];
          if (!rows.length) break;

          for (const row of rows) {
            const rowPins = mapTitleRowToPins(row);
            for (const pin of rowPins) {
              const key = `${row.slug}-${pin.lat.toFixed(4)}-${pin.lng.toFixed(4)}-${pin.label.toLowerCase()}`;
              if (seen.has(key)) continue;
              seen.add(key);
              collected.push(pin);
            }
          }

          if (rows.length < batchSize) break;
        }

        if (!cancelled) setAllSpots(collected);
      } catch (err) {
        console.error("Failed to load nearby spots:", err);
        if (!cancelled) setAllSpots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, allSpots.length]);

  const nearbyPins = useMemo<NearbyPin[]>(() => {
    if (!center || !enabled) return [];
    return allSpots
      .map((p) => ({
        ...p,
        distanceKm: haversineKm(center.lat, center.lng, p.lat, p.lng),
      }))
      .filter((p) => p.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [allSpots, center, radiusKm, enabled]);

  return { nearbyPins, loading };
}
