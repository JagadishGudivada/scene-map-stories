import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("related-titles");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi", 10766: "Soap", 10767: "Talk", 10768: "War",
};

const IMG = "https://image.tmdb.org/t/p/";

type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  adult?: boolean;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  original_language?: string;
  popularity?: number;
};

async function tmdbSearch(apiKey: string, kind: "movie" | "tv", query: string, year?: number) {
  const url = new URL(`https://api.themoviedb.org/3/search/${kind}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  if (year) url.searchParams.set(kind === "movie" ? "year" : "first_air_date_year", String(year));
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const results: TmdbItem[] = Array.isArray(data?.results) ? data.results : [];
  return results[0] || null;
}

async function tmdbRelated(apiKey: string, kind: "movie" | "tv", id: number) {
  // try recommendations first, fall back to similar
  for (const ep of ["recommendations", "similar"]) {
    const url = new URL(`https://api.themoviedb.org/3/${kind}/${id}/${ep}`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "en-US");
    url.searchParams.set("page", "1");
    const res = await fetch(url.toString());
    if (!res.ok) continue;
    const data = await res.json();
    const results: TmdbItem[] = Array.isArray(data?.results) ? data.results : [];
    if (results.length > 0) return results;
  }
  return [] as TmdbItem[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim();
    const year = Number(body?.year) || undefined;
    const type = (body?.type === "Series" ? "Series" : "Movie") as "Movie" | "Series";
    if (!title) {
      return new Response(JSON.stringify({ error: "title required", titles: [] }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
    if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY is not configured");

    const kind: "movie" | "tv" = type === "Series" ? "tv" : "movie";
    const source = await tmdbSearch(TMDB_API_KEY, kind, title, year)
      || await tmdbSearch(TMDB_API_KEY, kind === "movie" ? "tv" : "movie", title, year);
    if (!source) {
      return new Response(JSON.stringify({ titles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sourceKind: "movie" | "tv" = source.title ? "movie" : "tv";

    const related = await tmdbRelated(TMDB_API_KEY, sourceKind, source.id);

    const filtered = related
      .filter((m) => !m.adult)
      .filter((m) => (m.poster_path || m.backdrop_path))
      .filter((m) => (m.vote_count ?? 0) >= 50)
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 8);

    const mapped = filtered.map((m) => {
      const t = m.title || m.name || "Untitled";
      const date = m.release_date || m.first_air_date || "";
      const y = Number(date.slice(0, 4)) || year || new Date().getFullYear();
      const genres = (m.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean).slice(0, 3);
      const poster = m.poster_path ? `${IMG}w500${m.poster_path}` : `${IMG}w780${m.backdrop_path}`;
      const backdrop = m.backdrop_path ? `${IMG}w1280${m.backdrop_path}` : poster;
      return {
        id: `tmdb-${m.id}`,
        title: t,
        year: y,
        type: sourceKind === "tv" ? "Series" : "Movie",
        rating: Number((m.vote_average || 0).toFixed(1)),
        coverImage: poster,
        heroImage: backdrop,
        locationCount: 0,
        locations: [] as string[],
        genres: genres.length > 0 ? genres : ["Drama"],
      };
    });

    return new Response(JSON.stringify({ titles: mapped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.error("related-titles error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", titles: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
