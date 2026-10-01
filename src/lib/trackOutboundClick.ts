import { supabase } from "@/integrations/supabase/client";
import type { TripPartner, TripSurface } from "./affiliate";

const SESSION_KEY = "sv_session_id";

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/** Fire-and-forget. Never blocks or breaks navigation. */
export function trackOutboundClick(args: {
  partner: TripPartner;
  surface: TripSurface;
  label: string;
  titleId?: string | null;
  clusterId?: string | null;
}): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      await supabase.from("outbound_clicks").insert({
        user_id: data.session?.user?.id ?? null,
        session_id: sessionId(),
        title_id: args.titleId ?? null,
        cluster_id: args.clusterId ?? null,
        partner: args.partner,
        surface: args.surface,
        label: args.label,
      });
    } catch {
      /* analytics must never break UX */
    }
  })();
}
