import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockTitles, type MediaType, type Title } from "@/lib/mockData";
import { slugifyTitle } from "@/hooks/useAITitleSearch";

type WeeklyCache = {
  weekKey: string;
  year: number;
  updatedAt: string;
  titles: Title[];
};

type TitleResult = {
  title: string;
  year: number;
  type: MediaType;
  rating?: number;
  posterUrl?: string;
  genres?: string[];
};

const CACHE_KEY = "weekly-current-year-titles-v3";

function getIsoWeekKey(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function hashString(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

function mapToTitleCard(result: TitleResult): Title {
  const matched = mockTitles.find(
    (t) => t.title.toLowerCase() === result.title.toLowerCase() && t.type === result.type
  );
  if (matched) {
    return {
      ...matched,
      id: `weekly-${slugifyTitle(result.title, result.year)}`,
      year: result.year,
      type: result.type,
      coverImage: result.posterUrl || matched.coverImage,
      rating: result.rating ?? matched.rating,
      genres: result.genres && result.genres.length > 0 ? result.genres : matched.genres,
    };
  }

  const h = hashString(`${result.title}-${result.year}-${result.type}`);
  const coverImage = result.posterUrl || mockTitles[0]?.coverImage || "";
  const defaultGenres: Record<MediaType, string[]> = {
    Movie: ["Drama"],
    Series: ["Drama", "Mystery"],
    Book: ["Drama", "Fantasy"],
  };

  return {
    id: `weekly-${slugifyTitle(result.title, result.year)}`,
    title: result.title,
    year: result.year,
    type: result.type,
    coverImage,
    locationCount: 8 + (h % 22),
    rating: result.rating ?? Number((7 + ((h % 21) / 10)).toFixed(1)),
    locations: ["Featured locations"],
    genres: result.genres && result.genres.length > 0 ? result.genres : defaultGenres[result.type],
  };
}

function parseCache(raw: string | null): WeeklyCache | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WeeklyCache;
    if (!parsed || !Array.isArray(parsed.titles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useWeeklyCurrentYearTitles() {
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const weekKey = useMemo(() => getIsoWeekKey(), []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      const cached = parseCache(localStorage.getItem(CACHE_KEY));
      if (cached && cached.weekKey === weekKey && cached.year === currentYear && cached.titles.length > 0) {
        if (!cancelled) {
          setTitles(cached.titles);
          setUpdatedAt(cached.updatedAt);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("weekly-movies", {
          body: { year: currentYear },
        });

        if (fnError) {
          throw new Error("Unable to fetch latest movies");
        }

        const apiTitles: TitleResult[] = (data?.movies || []).map((item: any) => ({
          title: String(item.title),
          year: Number(item.year),
          type: "Movie",
          rating: Number(item.rating),
          posterUrl: item.posterUrl ? String(item.posterUrl) : undefined,
          genres: Array.isArray(item.genres) ? item.genres.map((g: unknown) => String(g)).slice(0, 3) : undefined,
        }));

        const currentYearTitles = apiTitles
          .filter((item) => item.year === currentYear)
          .filter((item) => (item.rating ?? 0) >= 7.5)
          .slice(0, 8);
        if (currentYearTitles.length === 0) {
          throw new Error("No current-year titles returned");
        }

        const mapped = currentYearTitles.map(mapToTitleCard);
        const payload: WeeklyCache = {
          weekKey,
          year: currentYear,
          updatedAt: new Date().toISOString(),
          titles: mapped,
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));

        if (!cancelled) {
          setTitles(mapped);
          setUpdatedAt(payload.updatedAt);
        }
      } catch (e) {
        const fallback = mockTitles
          .filter((t) => t.year === currentYear)
          .slice(0, 8);
        if (!cancelled) {
          if (fallback.length > 0) {
            setTitles(fallback);
          }
          setError(e instanceof Error ? e.message : "Unable to load weekly titles");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [currentYear, weekKey]);

  return { titles, loading, error, updatedAt, currentYear };
}
