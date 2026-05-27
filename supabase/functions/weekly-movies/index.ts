import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TmdbMovie = {
  media_type?: string;
  title: string;
  name?: string;
  release_date: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  poster_path: string | null;
  backdrop_path: string | null;
  original_language?: string;
};

type TmdbImageConfig = {
  secure_base_url: string;
  poster_sizes: string[];
  backdrop_sizes: string[];
};

let cachedImageConfig: { value: TmdbImageConfig; expiresAt: number } | null = null;

function isTmdbImageSize(value: string) {
  return value === "original" || /^w\d+$/.test(value) || /^h\d+$/.test(value);
}

function normalizeSizes(sizes: unknown): string[] {
  if (!Array.isArray(sizes)) return [];
  return sizes
    .filter((s): s is string => typeof s === "string")
    .filter(isTmdbImageSize);
}

function getLargestNonOriginalSize(sizes: string[], fallback: string) {
  const candidates = sizes.filter((s) => /^w\d+$/.test(s));
  if (candidates.length === 0) return fallback;
  candidates.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return candidates[candidates.length - 1];
}

async function getTmdbImageConfig(apiKey: string): Promise<TmdbImageConfig> {
  const now = Date.now();
  if (cachedImageConfig && cachedImageConfig.expiresAt > now) {
    return cachedImageConfig.value;
  }

  const configUrl = new URL("https://api.themoviedb.org/3/configuration");
  configUrl.searchParams.set("api_key", apiKey);
  const configRes = await fetch(configUrl.toString());
  if (!configRes.ok) {
    console.error("TMDB configuration error:", configRes.status, await configRes.text());
    throw new Error("TMDB configuration request failed");
  }

  const configData = await configRes.json();
  const images = configData?.images || {};
  const secureBaseUrl = typeof images?.secure_base_url === "string"
    ? images.secure_base_url
    : "https://image.tmdb.org/t/p/";

  const value: TmdbImageConfig = {
    secure_base_url: secureBaseUrl,
    poster_sizes: normalizeSizes(images?.poster_sizes),
    backdrop_sizes: normalizeSizes(images?.backdrop_sizes),
  };

  cachedImageConfig = {
    value,
    expiresAt: now + 24 * 60 * 60 * 1000,
  };

  return value;
}

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  10759: "Action & Adventure",
  35: "Comedy",
  80: "Crime",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await req.json().catch(() => ({}));

    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
    if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY is not configured");

    const imageConfig = await getTmdbImageConfig(TMDB_API_KEY);
    const posterSize = getLargestNonOriginalSize(imageConfig.poster_sizes, "w780");
    const backdropSize = getLargestNonOriginalSize(imageConfig.backdrop_sizes, "w1280");

    const url = new URL("https://api.themoviedb.org/3/trending/all/week");
    url.searchParams.set("api_key", TMDB_API_KEY);
    url.searchParams.set("language", "en-US");
    url.searchParams.set("page", "1");

    const tmdbRes = await fetch(url.toString());
    if (!tmdbRes.ok) {
      console.error("TMDB trending error:", tmdbRes.status, await tmdbRes.text());
      throw new Error("TMDB request failed");
    }

    const tmdbData = await tmdbRes.json();
    let movies: TmdbMovie[] = Array.isArray(tmdbData?.results) ? tmdbData.results : [];

    if (movies.length < 8) {
      const page2Url = new URL("https://api.themoviedb.org/3/trending/all/week");
      page2Url.searchParams.set("api_key", TMDB_API_KEY);
      page2Url.searchParams.set("language", "en-US");
      page2Url.searchParams.set("page", "2");

      const page2Res = await fetch(page2Url.toString());
      if (page2Res.ok) {
        const page2Data = await page2Res.json();
        const page2Movies: TmdbMovie[] = Array.isArray(page2Data?.results) ? page2Data.results : [];

        const byTitle = new Map<string, TmdbMovie>();
        for (const m of movies) {
          const key = `${m.media_type || "movie"}:${m.title || m.name || ""}`;
          byTitle.set(key, m);
        }
        for (const m of page2Movies) {
          const key = `${m.media_type || "movie"}:${m.title || m.name || ""}`;
          if (!byTitle.has(key)) {
            byTitle.set(key, m);
          }
        }
        movies = Array.from(byTitle.values());
      }
    }

    const mapped = movies
      .filter((m) => {
        if (!m.poster_path) return false;
        if (m.media_type !== "movie" && m.media_type !== "tv") return false;
        if (!m.original_language || m.original_language !== "en") return false;
        if ((m.genre_ids || []).includes(16) || (m.genre_ids || []).includes(99)) return false;
        return Boolean(m.release_date || m.first_air_date);
      })
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
      .slice(0, 12)
      .map((m) => {
        const releaseDate = m.release_date || m.first_air_date || "";
        const movieYear = Number(releaseDate.slice(0, 4)) || new Date().getFullYear();
        const genres = (m.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean).slice(0, 3);
        const title = m.title || m.name || "Untitled";
        const normalizedType = m.media_type === "tv" ? "Series" : "Movie";

        return {
          title,
          year: movieYear,
          type: normalizedType as "Movie" | "Series",
          rating: Number(m.vote_average?.toFixed(1) || "0"),
          posterPath: m.poster_path,
          posterUrl: `${imageConfig.secure_base_url}${posterSize}${m.poster_path}`,
          backdropPath: m.backdrop_path,
          backdropUrl: m.backdrop_path
            ? `${imageConfig.secure_base_url}${backdropSize}${m.backdrop_path}`
            : undefined,
          imageBaseUrl: imageConfig.secure_base_url,
          posterSizes: imageConfig.poster_sizes,
          backdropSizes: imageConfig.backdrop_sizes,
          genres: genres.length > 0 ? genres : ["Drama"],
        };
      });

    return new Response(JSON.stringify({ movies: mapped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-movies error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", movies: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
