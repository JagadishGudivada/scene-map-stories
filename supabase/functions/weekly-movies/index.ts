import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TmdbMovie = {
  title: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  poster_path: string | null;
};

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
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
    const body = await req.json().catch(() => ({}));
    const year = Number(body?.year) || new Date().getFullYear();

    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
    if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY is not configured");

    const today = new Date().toISOString().slice(0, 10);

    const url = new URL("https://api.themoviedb.org/3/discover/movie");
    url.searchParams.set("api_key", TMDB_API_KEY);
    url.searchParams.set("language", "en-US");
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("include_video", "false");
    url.searchParams.set("primary_release_year", String(year));
    url.searchParams.set("release_date.lte", today);
    url.searchParams.set("vote_average.gte", "7.5");
    url.searchParams.set("vote_count.gte", "600");
    url.searchParams.set("sort_by", "vote_average.desc");
    url.searchParams.set("page", "1");

    const tmdbRes = await fetch(url.toString());
    if (!tmdbRes.ok) {
      console.error("TMDB discover error:", tmdbRes.status, await tmdbRes.text());
      throw new Error("TMDB request failed");
    }

    const tmdbData = await tmdbRes.json();
    const movies: TmdbMovie[] = Array.isArray(tmdbData?.results) ? tmdbData.results : [];

    const mapped = movies
      .filter((m) => m.poster_path && m.release_date)
      .slice(0, 12)
      .map((m) => {
        const movieYear = Number((m.release_date || "").slice(0, 4)) || year;
        const genres = (m.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean).slice(0, 3);

        return {
          title: m.title,
          year: movieYear,
          type: "Movie" as const,
          rating: Number(m.vote_average?.toFixed(1) || "0"),
          posterUrl: `https://image.tmdb.org/t/p/w780${m.poster_path}`,
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
