import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TripCluster = Database["public"]["Tables"]["destination_clusters"]["Row"];

export interface TripClustersResult {
  titleId: string | null;
  posterUrl: string | null;
  clusters: TripCluster[];
}

/** Visitable, verified clusters for a title slug; UK first, then rank_score desc. */
export function useTripClusters(titleSlug: string | undefined) {
  return useQuery<TripClustersResult>({
    queryKey: ["trip-clusters", titleSlug],
    enabled: Boolean(titleSlug),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data: title, error: tErr } = await supabase
        .from("titles")
        .select("id, poster_url")
        .eq("slug", titleSlug!)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!title) return { titleId: null, posterUrl: null, clusters: [] };
      const { data, error } = await supabase
        .from("destination_clusters")
        .select("*")
        .eq("title_id", title.id)
        .eq("is_visitable", true)
        .gt("verified_location_count", 0)
        .order("rank_score", { ascending: false });
      if (error) throw error;
      const clusters = [...(data ?? [])].sort((a, b) => {
        const uk = Number(b.country_iso2 === "GB") - Number(a.country_iso2 === "GB");
        return uk || b.rank_score - a.rank_score;
      });
      return { titleId: title.id, posterUrl: title.poster_url, clusters };
    },
  });
}
