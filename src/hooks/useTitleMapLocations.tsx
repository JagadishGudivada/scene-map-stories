import { useEffect, useState } from "react";
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

type TitleRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  poster_url: string | null;
  backdrop_url: string | null;
  data: unknown;
};

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

function mapRowToPins(row: TitleRow): MapPin[] {
  const locations = toLocationArray(row.data);
  const type = normalizeMediaType(row.type);

  return locations
    .map((location) => {
      const lat = toNumber(location.lat);
      const lng = toNumber(location.lng);
      if (lat === null || lng === null) return null;

      const label =
        (typeof location.label === "string" && location.label.trim()) ||
        (typeof location.name === "string" && location.name.trim()) ||
        [location.city, location.country].filter(Boolean).join(", ") ||
        row.title;

      return {
        lat,
        lng,
        label,
        title: row.title,
        type,
        image:
          (typeof location.image_url === "string" && location.image_url) ||
          (typeof location.image === "string" && location.image) ||
          row.poster_url ||
          row.backdrop_url ||
          undefined,
        city: typeof location.city === "string" ? location.city : undefined,
        country: typeof location.country === "string" ? location.country : undefined,
      } satisfies MapPin;
    })
    .filter((pin): pin is MapPin => Boolean(pin));
}

export function useTitleMapLocations() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("titles")
          .select("id, slug, title, type, poster_url, backdrop_url, data")
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) throw error;

        const collected: MapPin[] = [];
        const seen = new Set<string>();

        for (const row of (data || []) as TitleRow[]) {
          const titlePins = mapRowToPins(row);

          for (const pin of titlePins) {
            const key = `${row.slug}-${pin.lat.toFixed(4)}-${pin.lng.toFixed(4)}-${pin.label.toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            collected.push(pin);
          }
        }

        if (!cancelled) {
          setPins(collected);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPins([]);
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return { pins, loading };
}