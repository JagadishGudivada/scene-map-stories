import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockTitles, type MediaType, type Title } from "@/lib/mockData";

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

function mapTitleRowToCard(row: {
  id: string;
  title: string;
  year: number | null;
  type: unknown;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  genres: string[] | null;
  data: unknown;
}): Title | null {
  const payload = row.data && typeof row.data === "object"
    ? (row.data as Record<string, unknown>)
    : {};

  const title = typeof row.title === "string" && row.title.trim().length > 0
    ? row.title.trim()
    : typeof payload.title === "string" && payload.title.trim().length > 0
    ? payload.title.trim()
    : "";
  const parsedYear = typeof row.year === "number" ? row.year : Number(payload.year);
  if (!title || !Number.isFinite(parsedYear)) return null;

  const type = normalizeMediaType(row.type);
  const locations = toLocationLabels(payload.locations);
  const genres = row.genres && row.genres.length > 0 ? row.genres : toStringArray(payload.genres);
  const coverImage =
    row.poster_url ||
    (typeof payload.coverImage === "string" && payload.coverImage) ||
    (typeof payload.posterUrl === "string" && payload.posterUrl) ||
    row.backdrop_url ||
    (typeof payload.heroImage === "string" && payload.heroImage) ||
    (typeof payload.backdropUrl === "string" && payload.backdropUrl) ||
    mockTitles[0]?.coverImage ||
    "";
  const heroImage =
    row.backdrop_url ||
    (typeof payload.backdropImage === "string" && payload.backdropImage) ||
    (typeof payload.heroImage === "string" && payload.heroImage) ||
    (typeof payload.backdropUrl === "string" && payload.backdropUrl) ||
    coverImage;

  return {
    id: row.id,
    title,
    year: parsedYear,
    type,
    coverImage,
    heroImage,
    locationCount: locations.length || 1,
    rating: typeof row.rating === "number" ? row.rating : Number(payload.rating) || 7.5,
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
          .from("titles")
          .select("id, title, year, type, poster_url, backdrop_url, rating, genres, data, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (queryError) throw queryError;

        const mapped = (data || [])
          .map((row) => mapTitleRowToCard(row))
          .filter((item): item is Title => Boolean(item));

        if (!cancelled) setTitles(mapped);
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
