import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWeeklyCurrentYearTitles } from "@/hooks/useWeeklyCurrentYearTitles";
import { slugifyTitle } from "@/hooks/useAITitleSearch";
import type { MapPin } from "@/components/LeafletMap";
import type { MediaType } from "@/lib/mockData";

const CACHE_KEY = "weekly-release-locations-v4";

type CachePayload = {
  weekKey: string;
  pins: MapPin[];
  updatedAt: string;
};

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
  year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  data: unknown;
  created_at: string;
};

function normalizeMediaType(type: string | null | undefined): MediaType {
  if (type === "Movie" || type === "Series" || type === "Book") return type;
  if (type === "Series") return "Series";
  if (type === "Book") return "Book";
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

function mapRowToPins(row: TitleRow, forcedType?: MediaType): MapPin[] {
  const locations = toLocationArray(row.data);
  const type = forcedType ?? normalizeMediaType(row.type);

  return locations
    .map((loc) => {
      const lat = toNumber(loc.lat);
      const lng = toNumber(loc.lng);
      if (lat === null || lng === null) return null;

      const label =
        (typeof loc.label === "string" && loc.label.trim()) ||
        (typeof loc.name === "string" && loc.name.trim()) ||
        [loc.city, loc.country].filter(Boolean).join(", ") ||
        row.title;

      return {
        lat,
        lng,
        label,
        title: row.title,
        type,
        image:
          (typeof loc.image_url === "string" && loc.image_url) ||
          (typeof loc.image === "string" && loc.image) ||
          row.poster_url ||
          row.backdrop_url ||
          undefined,
        city: typeof loc.city === "string" ? loc.city : undefined,
        country: typeof loc.country === "string" ? loc.country : undefined,
      } as MapPin;
    })
    .filter((pin): pin is MapPin => Boolean(pin));
}

function getIsoWeekKey(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function useWeeklyReleaseLocations() {
  const { titles, loading: titlesLoading } = useWeeklyCurrentYearTitles();
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (titlesLoading) return;

    let cancelled = false;
    const weekKey = getIsoWeekKey();

    // Try cache
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachePayload;
        if (cached?.weekKey === weekKey && Array.isArray(cached.pins) && cached.pins.length > 0) {
          setPins(cached.pins);
          setLoading(false);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    const run = async () => {
      setLoading(true);
      try {
        const collected: MapPin[] = [];
        const seen = new Set<string>();

        const addPin = (pin: MapPin) => {
          if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return;
          const key = `${pin.title || ""}-${pin.lat.toFixed(4)}-${pin.lng.toFixed(4)}`;
          if (seen.has(key)) return;
          seen.add(key);
          collected.push(pin);
        };

        const weeklyTitles = titles.slice(0, 8);
        const slugs = weeklyTitles.map((t) => slugifyTitle(t.title, t.year, t.type));
        const expectedTypeBySlug = new Map(slugs.map((slug, index) => [slug, weeklyTitles[index].type]));

        let weeklyRows: TitleRow[] = [];
        if (slugs.length > 0) {
          const { data, error } = await supabase
            .from("titles")
            .select("id, slug, title, type, year, poster_url, backdrop_url, data, created_at")
            .in("slug", slugs);
          if (error) throw error;
          weeklyRows = (data || []) as TitleRow[];

          const order = new Map(slugs.map((slug, index) => [slug, index]));
          weeklyRows.sort((a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999));
        }

        // Fallback to most recent titles from DB when weekly slug matching is unavailable.
        if (weeklyRows.length === 0) {
          const { data, error } = await supabase
            .from("titles")
            .select("id, slug, title, type, year, poster_url, backdrop_url, data, created_at")
            .order("created_at", { ascending: false })
            .limit(8);
          if (error) throw error;
          weeklyRows = (data || []) as TitleRow[];
        }

        for (const row of weeklyRows) {
          const expectedType = expectedTypeBySlug.get(row.slug);
          const pinsForTitle = mapRowToPins(row, expectedType);
          for (const pin of pinsForTitle) addPin(pin);
        }

        if (cancelled) return;

        setPins(collected);
        setLoading(false);

        try {
          const payload: CachePayload = {
            weekKey,
            pins: collected,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
        } catch {
          /* ignore quota */
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
  }, [titles, titlesLoading]);

  return { pins, loading: loading || titlesLoading };
}
