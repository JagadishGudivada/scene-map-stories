import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { db } from "../_shared/store.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("title-videos");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Video = {
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
  published_at?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": status === 200 ? "public, max-age=3600, s-maxage=86400" : "no-store",
    },
  });

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function rank(v: Video) {
  const typeScore = v.type === "Trailer" ? 3 : v.type === "Teaser" ? 2 : 1;
  return typeScore * 10 + (v.official ? 5 : 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug : "";
    const title = typeof body.title === "string" ? body.title : "";
    const year = typeof body.year === "number" ? body.year : undefined;
    const type = body.type === "Series" || body.type === "Book" ? body.type : "Movie";
    let tmdbId = typeof body.tmdb_id === "number" ? body.tmdb_id : undefined;

    if (type === "Book") return json({ videos: [] });
    if (!slug && !title && !tmdbId) return json({ error: "slug, title or tmdb_id required" }, 400);

    const apiKey = Deno.env.get("TMDB_API_KEY");
    if (!apiKey) return json({ videos: [] });

    const kinds: Array<"movie" | "tv"> = type === "Series" ? ["tv", "movie"] : ["movie", "tv"];

    // Resolve tmdb id from the title when it wasn't persisted with the record.
    let resolvedKind: "movie" | "tv" | null = null;
    if (!tmdbId && title) {
      for (const kind of kinds) {
        const url = new URL(`https://api.themoviedb.org/3/search/${kind}`);
        url.searchParams.set("api_key", apiKey);
        url.searchParams.set("query", title);
        url.searchParams.set("include_adult", "false");
        if (year) url.searchParams.set(kind === "movie" ? "year" : "first_air_date_year", String(year));
        const data = await fetchJson<{ results?: any[] }>(url.toString());
        const best = (data?.results || [])[0];
        if (best?.id) {
          tmdbId = best.id as number;
          resolvedKind = kind;
          break;
        }
      }
    }

    if (!tmdbId) return json({ videos: [] });

    const videos: Video[] = [];
    for (const kind of resolvedKind ? [resolvedKind] : kinds) {
      const data = await fetchJson<{ results?: Video[] }>(
        `https://api.themoviedb.org/3/${kind}/${tmdbId}/videos?api_key=${apiKey}`
      );
      const found = (data?.results || []).filter(
        (v) => v.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(v.type)
      );
      if (found.length) {
        videos.push(...found);
        break;
      }
    }

    const ranked = videos
      .sort((a, b) => rank(b) - rank(a))
      .slice(0, 4)
      .map((v) => ({ key: v.key, name: v.name, type: v.type, site: v.site }));

    // Cache onto the stored title so subsequent reads skip TMDB entirely.
    if (slug) {
      try {
        const { data: row } = await db().from("titles").select("data").eq("slug", slug).maybeSingle();
        if (row) {
          const base = (row as any).data && typeof (row as any).data === "object" ? (row as any).data : {};
          await db()
            .from("titles")
            .update({ data: { ...base, videos: ranked }, tmdb_id: tmdbId })
            .eq("slug", slug);
        }
      } catch (e) {
        log.error("cache videos failed", e);
      }
    }

    return json({ videos: ranked, tmdb_id: tmdbId });
  } catch (e) {
    log.error("title-videos error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
