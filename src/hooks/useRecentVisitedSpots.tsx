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

type SpotRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  flag: string | null;
  image_url: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

type TitleSpotRow = {
  spot_id: string;
  title_id: string;
};

type TitleRow = {
  id: string;
  title: string;
};

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
        const { data, error: spotsError } = await supabase
          .from("spots")
          .select("id, slug, name, city, country, flag, image_url, description, lat, lng, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (spotsError) throw spotsError;

        const recentSpots = (data || []) as SpotRow[];

        if (recentSpots.length === 0) {
          if (!cancelled) setSpots([]);
          return;
        }

        const spotIds = recentSpots.map((spot) => spot.id);

        const { data: titleSpotRows, error: titleSpotsError } = await supabase
          .from("title_spots")
          .select("spot_id, title_id")
          .in("spot_id", spotIds);
        if (titleSpotsError) throw titleSpotsError;

        const titleIds = Array.from(new Set((titleSpotRows || []).map((row) => row.title_id)));

        let titlesById = new Map<string, string>();
        if (titleIds.length > 0) {
          const { data: titleRows, error: titlesError } = await supabase
            .from("titles")
            .select("id, title")
            .in("id", titleIds);
          if (titlesError) throw titlesError;
          titlesById = new Map(((titleRows || []) as TitleRow[]).map((row) => [row.id, row.title]));
        }

        const titleLinksBySpotId = new Map<string, string[]>();
        for (const row of (titleSpotRows || []) as TitleSpotRow[]) {
          const title = titlesById.get(row.title_id);
          if (!title) continue;
          const existing = titleLinksBySpotId.get(row.spot_id) || [];
          if (existing.includes(title)) continue;
          existing.push(title);
          titleLinksBySpotId.set(row.spot_id, existing);
        }

        const mapped: RecentSpot[] = recentSpots.map((spot) => ({
          slug: spot.slug,
          name: spot.name,
          city: spot.city || "",
          country: spot.country || "",
          flag: spot.flag || undefined,
          image: spot.image_url || undefined,
          description: spot.description || undefined,
          titles: (titleLinksBySpotId.get(spot.id) || []).slice(0, 4),
          lat: spot.lat ?? undefined,
          lng: spot.lng ?? undefined,
          createdAt: spot.created_at,
        }));

        if (!cancelled) setSpots(mapped);
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
