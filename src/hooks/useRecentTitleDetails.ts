import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockTitles, type MediaType, type Title } from "@/lib/mockData";
import { slugifyTitle } from "@/hooks/useAITitleSearch";

function normalizeMediaType(value: unknown): MediaType {
  if (value === "Series" || value === "Book") return value;
  return "Movie";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function toLocationLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "label" in item && typeof item.label === "string") {
        return item.label;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function parseFromCacheKey(cacheKey: string): { title: string; year: number | null } {
  const trimmed = cacheKey.trim();
  const match = trimmed.match(/^(.*?)-(\d{4})$/);
  if (!match) {
    const titleOnly = trimmed
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return { title: titleOnly, year: null };
  }

  const title = match[1]
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const year = Number(match[2]);
  return { title, year: Number.isFinite(year) ? year : null };
}

function mapCachePayloadToTitle(cacheKey: string, payload: unknown): Title | null {
  if (!payload || typeof payload !== "object") return null;

  const raw = payload as Record<string, unknown>;
  const nested = (raw.data || raw.result || raw.payload) as Record<string, unknown> | undefined;
  const p = nested && typeof nested === "object" ? nested : raw;
  const fromKey = parseFromCacheKey(cacheKey);
  const title = typeof p.title === "string" && p.title.trim().length > 0 ? p.title.trim() : fromKey.title;
  const parsedYear = typeof p.year === "number" ? p.year : Number(p.year);
  const year = Number.isFinite(parsedYear) ? parsedYear : fromKey.year;
  if (!title || !Number.isFinite(year)) return null;

  const type = normalizeMediaType(p.type);
  const locations = toLocationLabels(p.locations);
  const genres = toStringArray(p.genres);
  const coverImage =
    (typeof p.coverImage === "string" && p.coverImage) ||
    (typeof p.posterUrl === "string" && p.posterUrl) ||
    (typeof p.heroImage === "string" && p.heroImage) ||
    (typeof p.backdropUrl === "string" && p.backdropUrl) ||
    mockTitles[0]?.coverImage ||
    "";

  return {
    id: `recent-${cacheKey}`,
    title,
    year,
    type,
    coverImage,
    heroImage: (typeof p.heroImage === "string" && p.heroImage) || (typeof p.backdropUrl === "string" && p.backdropUrl) || coverImage,
    locationCount: locations.length || 1,
    rating: typeof p.rating === "number" ? p.rating : Number(p.rating) || 7.5,
    locations: locations.length > 0 ? locations.slice(0, 3) : ["Featured locations"],
    genres: genres.length > 0 ? genres.slice(0, 3) : ["Drama"],
  };
}

export function useRecentTitleDetails(limit = 8) {
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from("ai_cache")
          .select("cache_key, payload, created_at, expires_at")
          .eq("function_name", "title-details")
          .order("created_at", { ascending: false })
          .order("expires_at", { ascending: false })
          .limit(limit * 4);

        if (queryError) throw queryError;

        const mapped = (data || [])
          .map((row) => mapCachePayloadToTitle(row.cache_key, row.payload))
          .filter((item): item is Title => Boolean(item));

        const deduped = mapped.filter((item, index, arr) => {
          const key = slugifyTitle(item.title, item.year);
          return arr.findIndex((candidate) => slugifyTitle(candidate.title, candidate.year) === key) === index;
        }).slice(0, limit);

        if (!cancelled) setTitles(deduped);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load recently added titles");
          setTitles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { titles, loading, error };
}
