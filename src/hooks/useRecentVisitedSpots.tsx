import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RecentSpot = {
  slug: string;
  name: string;
  city: string;
  country: string;
  flag?: string;
  image?: string;
  description?: string;
  titles: string[];
  lat?: number;
  lng?: number;
  createdAt: string;
};

function slugifySpot(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapRow(cacheKey: string, payload: unknown, createdAt: string): RecentSpot | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!name) return null;
  const baseSlug = cacheKey.split("|")[0]?.trim() || slugifySpot(name);

  const titlesRaw = Array.isArray(p.titles) ? p.titles : [];
  const titles = titlesRaw.filter((t): t is string => typeof t === "string");

  return {
    slug: baseSlug,
    name,
    city: typeof p.city === "string" ? p.city : "",
    country: typeof p.country === "string" ? p.country : "",
    flag: typeof p.flag === "string" ? p.flag : undefined,
    image: typeof p.image === "string" ? p.image : undefined,
    description: typeof p.description === "string" ? p.description : undefined,
    titles: titles.slice(0, 4),
    lat: typeof p.lat === "number" ? p.lat : undefined,
    lng: typeof p.lng === "number" ? p.lng : undefined,
    createdAt,
  };
}

export function useRecentVisitedSpots(limit = 6) {
  const [spots, setSpots] = useState<RecentSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from("ai_cache")
          .select("cache_key, payload, created_at")
          .eq("function_name", "spot-details")
          .order("created_at", { ascending: false })
          .limit(limit * 4);
        if (qErr) throw qErr;
        const mapped = (data || [])
          .map((r) => mapRow(r.cache_key, r.payload, r.created_at as string))
          .filter((s): s is RecentSpot => Boolean(s));
        const seen = new Set<string>();
        const deduped: RecentSpot[] = [];
        for (const s of mapped) {
          if (seen.has(s.slug)) continue;
          seen.add(s.slug);
          deduped.push(s);
          if (deduped.length >= limit) break;
        }
        if (!cancelled) setSpots(deduped);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load recent spots");
          setSpots([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { spots, loading, error };
}
