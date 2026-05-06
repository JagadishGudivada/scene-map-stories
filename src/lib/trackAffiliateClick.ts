import { supabase } from "@/integrations/supabase/client";
import type { AffiliateService } from "./affiliates";

interface TrackArgs {
  partner: string;
  service: AffiliateService;
  spotName?: string;
  locationName?: string;
  origin?: string;
  destinationUrl: string;
}

/**
 * Fire-and-forget click logger. Never throws, never blocks navigation.
 * The user_id is auto-attached when a session exists.
 */
export function trackAffiliateClick(args: TrackArgs): void {
  try {
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user_id = data.session?.user?.id ?? null;
        await supabase.from("affiliate_clicks").insert({
          user_id,
          partner: args.partner,
          service: args.service,
          spot_name: args.spotName ?? null,
          location_name: args.locationName ?? null,
          origin: args.origin ?? null,
          destination_url: args.destinationUrl,
        });
      } catch {
        /* swallow — analytics must never break UX */
      }
    })();
  } catch {
    /* noop */
  }
}
