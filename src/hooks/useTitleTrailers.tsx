import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TitleVideo = { key: string; name: string; type: string; site: string };

/**
 * Trailers for a title. Reads the cached `titles.data.videos` first, then asks
 * the `title-videos` edge function (TMDB) and lets it warm the cache.
 */
export function useTitleTrailers(opts: {
  slug?: string;
  title?: string;
  year?: number;
  type?: "Movie" | "Series" | "Book";
  tmdbId?: number;
  cached?: TitleVideo[];
}) {
  const { slug, title, year, type, tmdbId, cached } = opts;
  const [videos, setVideos] = useState<TitleVideo[]>(cached ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cached?.length) {
      setVideos(cached);
      return;
    }
    if (type === "Book") {
      setVideos([]);
      return;
    }
    if (!slug && !title && !tmdbId) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.functions.invoke("title-videos", {
        body: { slug, title, year, type, tmdb_id: tmdbId },
      });
      if (cancelled) return;
      if (!error && Array.isArray(data?.videos)) setVideos(data.videos as TitleVideo[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, title, year, type, tmdbId, cached]);

  return { videos, loading };
}
