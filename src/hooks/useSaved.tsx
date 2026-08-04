import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type BeenHereSpotMeta = {
  spotName: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  type: "Movie" | "Series" | "Book";
};

export type VisitedSpotRow = {
  spot_slug: string;
  spot_name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  type: "Movie" | "Series" | "Book";
  created_at?: string;
};

type ToggleTable = "saved_titles" | "watched_titles" | "saved_locations" | "saved_spots";

type ToggleCopy = {
  signInDescription: string;
  addedTitle: string;
  addedDescription: string;
  removedDescription: string;
};

/**
 * Shared implementation for the simple "is this slug in my list?" toggles.
 * Every write is error-checked: on failure we surface a destructive toast and
 * keep local state untouched instead of silently pretending it succeeded.
 */
function useSlugToggle(
  table: ToggleTable,
  column: "title_slug" | "location_slug" | "spot_slug",
  slug: string,
  copy: ToggleCopy
) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !slug) {
      setActive(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from(table)
        .select("id")
        .eq("user_id", user.id)
        .eq(column, slug)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error(`[useSaved] failed to read ${table}`, error);
        return;
      }
      setActive(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, slug, table, column]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast({ title: "Sign in required", description: copy.signInDescription });
      return false;
    }
    if (!slug) return false;
    setLoading(true);
    try {
      if (active) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("user_id", user.id)
          .eq(column, slug);
        if (error) throw error;
        setActive(false);
        toast({ title: "Removed", description: copy.removedDescription });
      } else {
        const { error } = await supabase
          .from(table)
          .insert({ user_id: user.id, [column]: slug } as never);
        if (error) throw error;
        setActive(true);
        toast({ title: copy.addedTitle, description: copy.addedDescription });
      }
      return true;
    } catch (e) {
      console.error(`[useSaved] failed to write ${table}`, e);
      toast({
        title: "Something went wrong",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, active, slug, table, column, copy, toast]);

  return { active, toggle, loading };
}

export function useSavedTitle(titleSlug: string) {
  const { active, toggle, loading } = useSlugToggle("saved_titles", "title_slug", titleSlug, {
    signInDescription: "Please sign in to save titles.",
    addedTitle: "Saved!",
    addedDescription: "Title added to your saved list.",
    removedDescription: "Title removed from your saved list.",
  });
  return { saved: active, toggle, loading };
}

export function useWatchedTitle(titleSlug: string) {
  const { active, toggle, loading } = useSlugToggle("watched_titles", "title_slug", titleSlug, {
    signInDescription: "Please sign in to mark titles as watched.",
    addedTitle: "Watched!",
    addedDescription: "Title added to your watched list.",
    removedDescription: "Title removed from your watched list.",
  });
  return { watched: active, toggle, loading };
}

export function useSavedLocation(locationSlug: string) {
  const { active, toggle, loading } = useSlugToggle(
    "saved_locations",
    "location_slug",
    locationSlug,
    {
      signInDescription: "Please sign in to save locations.",
      addedTitle: "Saved!",
      addedDescription: "Location added to your saved list.",
      removedDescription: "Location removed from your saved list.",
    }
  );
  return { saved: active, toggle, loading };
}

export function useSavedSpot(spotSlug: string) {
  const { active, toggle, loading } = useSlugToggle("saved_spots", "spot_slug", spotSlug, {
    signInDescription: "Please sign in to save spots.",
    addedTitle: "Saved!",
    addedDescription: "Spot added to your wishlist.",
    removedDescription: "Spot removed from your wishlist.",
  });
  return { saved: active, toggle, loading };
}

export function useBeenHereSpot(spotSlug: string, meta?: BeenHereSpotMeta) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [visited, setVisited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !spotSlug) {
      setVisited(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("visited_spots")
        .select("id")
        .eq("user_id", user.id)
        .eq("spot_slug", spotSlug)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[useSaved] failed to read visited_spots", error);
        return;
      }
      setVisited(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, spotSlug]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to mark spots as visited." });
      return false;
    }
    setLoading(true);
    try {
      if (visited) {
        const { error } = await supabase
          .from("visited_spots")
          .delete()
          .eq("user_id", user.id)
          .eq("spot_slug", spotSlug);
        if (error) throw error;
        setVisited(false);
        toast({ title: "Removed", description: "Spot removed from your visited list." });
      } else {
        const spotName = meta?.spotName ?? spotSlug.replace(/-/g, " ");
        const { error } = await supabase.from("visited_spots").insert({
          user_id: user.id,
          spot_slug: spotSlug,
          spot_name: spotName,
          lat: meta?.lat ?? 0,
          lng: meta?.lng ?? 0,
          city: meta?.city ?? "Unknown City",
          country: meta?.country ?? "Unknown Country",
          type: meta?.type ?? "Movie",
        });
        if (error) throw error;
        setVisited(true);
        toast({ title: "Added", description: "Spot added to your profile as visited." });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("spot:revealed", {
              detail: {
                spotSlug,
                spotName,
                lat: meta?.lat,
                lng: meta?.lng,
                city: meta?.city,
                country: meta?.country,
                type: meta?.type ?? "Movie",
              },
            })
          );
        }
      }
      return true;
    } catch (e) {
      console.error("[useSaved] failed to write visited_spots", e);
      toast({
        title: "Something went wrong",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, visited, spotSlug, meta, toast]);

  return { visited, toggle, loading };
}

function useSlugList(
  table: ToggleTable,
  column: "title_slug" | "location_slug" | "spot_slug"
) {
  const { user } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSlugs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error(`[useSaved] failed to list ${table}`, error);
    setSlugs(((data ?? []) as Array<Record<string, string>>).map((d) => d[column]));
    setLoading(false);
  }, [user, table, column]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  return { slugs, loading, refresh };
}

export function useAllWatchedTitles() {
  return useSlugList("watched_titles", "title_slug");
}

export function useAllSavedTitles() {
  return useSlugList("saved_titles", "title_slug");
}

export function useAllSavedLocations() {
  return useSlugList("saved_locations", "location_slug");
}

export function useAllSavedSpots() {
  return useSlugList("saved_spots", "spot_slug");
}

export function useAllVisitedSpots() {
  const { user } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [spots, setSpots] = useState<VisitedSpotRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSlugs([]);
      setSpots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("visited_spots")
      .select("spot_slug, spot_name, lat, lng, city, country, type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error("[useSaved] failed to list visited_spots", error);
    const normalized: VisitedSpotRow[] =
      data?.map((d) => ({
        spot_slug: d.spot_slug,
        spot_name: d.spot_name ?? d.spot_slug.replace(/-/g, " "),
        lat: d.lat ?? 0,
        lng: d.lng ?? 0,
        city: d.city ?? "Unknown City",
        country: d.country ?? "Unknown Country",
        type: d.type === "Series" || d.type === "Book" ? d.type : "Movie",
        created_at: d.created_at ?? undefined,
      })) ?? [];
    setSpots(normalized);
    setSlugs(normalized.map((d) => d.spot_slug));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  return { slugs, spots, loading, refresh };
}
