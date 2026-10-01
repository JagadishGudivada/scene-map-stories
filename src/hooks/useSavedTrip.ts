import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

/** Save/unsave a title to the signed-in user's trip list. */
export function useSavedTrip(titleId: string | null | undefined) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setSaved(false);
    if (!user || !titleId) return;
    supabase
      .from("saved_trips")
      .select("id")
      .eq("user_id", user.id)
      .eq("title_id", titleId)
      .maybeSingle()
      .then(({ data }) => alive && setSaved(Boolean(data)));
    return () => {
      alive = false;
    };
  }, [user, titleId]);

  const toggle = useCallback(async () => {
    if (!user || !titleId || busy) return false;
    setBusy(true);
    const { error } = saved
      ? await supabase.from("saved_trips").delete().eq("user_id", user.id).eq("title_id", titleId)
      : await supabase.from("saved_trips").insert({ user_id: user.id, title_id: titleId });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't update your trips", description: "Please try again.", variant: "destructive" });
      return false;
    }
    setSaved(!saved);
    toast({ title: saved ? "Removed from your trips" : "Saved to your trips" });
    return true;
  }, [user, titleId, saved, busy]);

  return { saved, toggle, busy, signedIn: Boolean(user) };
}
