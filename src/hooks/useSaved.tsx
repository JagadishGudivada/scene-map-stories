import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
