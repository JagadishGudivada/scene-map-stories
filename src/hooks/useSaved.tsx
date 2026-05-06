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
};

export function useSavedTitle(titleSlug: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !titleSlug) return;
    supabase
      .from("saved_titles")
      .select("id")
      .eq("user_id", user.id)
      .eq("title_slug", titleSlug)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, titleSlug]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save titles." });
      return;
    }
    setLoading(true);
    if (saved) {
      await supabase.from("saved_titles").delete().eq("user_id", user.id).eq("title_slug", titleSlug);
      setSaved(false);
      toast({ title: "Removed", description: "Title removed from your saved list." });
    } else {
      await supabase.from("saved_titles").insert({ user_id: user.id, title_slug: titleSlug });
      setSaved(true);
      toast({ title: "Saved!", description: "Title added to your saved list." });
    }
    setLoading(false);
  }, [user, saved, titleSlug, toast]);

  return { saved, toggle, loading };
}

export function useSavedLocation(locationSlug: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !locationSlug) return;
    supabase
      .from("saved_locations")
      .select("id")
      .eq("user_id", user.id)
      .eq("location_slug", locationSlug)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, locationSlug]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save locations." });
      return;
    }
    setLoading(true);
    if (saved) {
      await supabase.from("saved_locations").delete().eq("user_id", user.id).eq("location_slug", locationSlug);
      setSaved(false);
      toast({ title: "Removed", description: "Location removed from your saved list." });
    } else {
      await supabase.from("saved_locations").insert({ user_id: user.id, location_slug: locationSlug });
      setSaved(true);
      toast({ title: "Saved!", description: "Location added to your saved list." });
    }
    setLoading(false);
  }, [user, saved, locationSlug, toast]);

  return { saved, toggle, loading };
}

export function useSavedSpot(spotSlug: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !spotSlug) return;
    supabase
      .from("saved_spots")
      .select("id")
      .eq("user_id", user.id)
      .eq("spot_slug", spotSlug)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, spotSlug]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save spots." });
      return;
    }
    setLoading(true);
    if (saved) {
      await supabase.from("saved_spots").delete().eq("user_id", user.id).eq("spot_slug", spotSlug);
      setSaved(false);
      toast({ title: "Removed", description: "Spot removed from your wishlist." });
    } else {
      await supabase.from("saved_spots").insert({ user_id: user.id, spot_slug: spotSlug });
      setSaved(true);
      toast({ title: "Saved!", description: "Spot added to your wishlist." });
    }
    setLoading(false);
  }, [user, saved, spotSlug, toast]);

  return { saved, toggle, loading };
}

export function useBeenHereSpot(spotSlug: string, meta?: BeenHereSpotMeta) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [visited, setVisited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !spotSlug) return;
    supabase
      .from("visited_spots")
      .select("id")
      .eq("user_id", user.id)
      .eq("spot_slug", spotSlug)
      .maybeSingle()
      .then(({ data }) => setVisited(!!data));
  }, [user, spotSlug]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to mark spots as visited." });
      return;
    }
    setLoading(true);
    if (visited) {
      await supabase.from("visited_spots").delete().eq("user_id", user.id).eq("spot_slug", spotSlug);
      setVisited(false);
      toast({ title: "Removed", description: "Spot removed from your visited list." });
    } else {
      await supabase.from("visited_spots").insert({
        user_id: user.id,
        spot_slug: spotSlug,
        spot_name: meta?.spotName ?? spotSlug.replace(/-/g, " "),
        lat: meta?.lat ?? 0,
        lng: meta?.lng ?? 0,
        city: meta?.city ?? "Unknown City",
        country: meta?.country ?? "Unknown Country",
        type: meta?.type ?? "Movie",
      });
      setVisited(true);
      toast({ title: "Added", description: "Spot added to your profile as visited." });
    }
    setLoading(false);
  }, [user, visited, spotSlug, meta, toast]);

  return { visited, toggle, loading };
}

export function useAllSavedTitles() {
  const { user } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setSlugs([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("saved_titles")
      .select("title_slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSlugs(data?.map((d) => d.title_slug) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { slugs, loading, refresh };
}

export function useAllSavedLocations() {
  const { user } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setSlugs([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("saved_locations")
      .select("location_slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSlugs(data?.map((d) => d.location_slug) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { slugs, loading, refresh };
}

export function useAllSavedSpots() {
  const { user } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setSlugs([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("saved_spots")
      .select("spot_slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSlugs(data?.map((d) => d.spot_slug) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { slugs, loading, refresh };
}

export function useAllVisitedSpots() {
  const { user } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [spots, setSpots] = useState<VisitedSpotRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setSlugs([]); setSpots([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("visited_spots")
      .select("spot_slug, spot_name, lat, lng, city, country, type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const normalized: VisitedSpotRow[] =
      data?.map((d) => ({
        spot_slug: d.spot_slug,
        spot_name: d.spot_name ?? d.spot_slug.replace(/-/g, " "),
        lat: d.lat ?? 0,
        lng: d.lng ?? 0,
        city: d.city ?? "Unknown City",
        country: d.country ?? "Unknown Country",
        type: d.type === "Series" || d.type === "Book" ? d.type : "Movie",
      })) ?? [];
    setSpots(normalized);
    setSlugs(normalized.map((d) => d.spot_slug));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { slugs, spots, loading, refresh };
}
