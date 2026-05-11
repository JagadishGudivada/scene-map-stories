import { useEffect, useState } from "react";
import { invokeCached } from "@/lib/aiClientCache";
import { useWeeklyCurrentYearTitles } from "@/hooks/useWeeklyCurrentYearTitles";
import type { MapPin } from "@/components/LeafletMap";
import type { MediaType } from "@/lib/mockData";

const CACHE_KEY = "weekly-release-locations-v1";

type CachePayload = {
  weekKey: string;
  pins: MapPin[];
  updatedAt: string;
};

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

    if (titles.length === 0) {
      setLoading(false);
      return;
    }

    const run = async () => {
      setLoading(true);
      const collected: MapPin[] = [];
      const seen = new Set<string>();

      // Run lookups in parallel for speed
      const results = await Promise.allSettled(
        titles.slice(0, 8).map(async (t) => {
          const query = `${t.title} ${t.year}`;
          const data = await invokeCached<any>(
            "search-locations",
            { query },
            `weekly:${query.toLowerCase()}`,
            { ttlSeconds: 60 * 60 * 24 * 7, persist: "session" }
          );
          const locs = Array.isArray(data?.locations) ? data.locations : [];
          return locs.map((loc: any) => ({
            lat: Number(loc.lat),
            lng: Number(loc.lng),
            label: String(loc.label || ""),
            title: t.title,
            type: (t.type as MediaType) || "Movie",
            image: t.coverImage,
          })) as MapPin[];
        })
      );

      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        for (const pin of r.value) {
          if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) continue;
          const key = `${pin.lat.toFixed(3)}-${pin.lng.toFixed(3)}-${pin.title}`;
          if (seen.has(key)) continue;
          seen.add(key);
          collected.push(pin);
        }
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
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [titles, titlesLoading]);

  return { pins, loading: loading || titlesLoading };
}
