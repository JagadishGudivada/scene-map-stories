import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo";

const DISMISS_KEY = "sarevista:nearby-dismissed";
const RADIUS_KM = 8;

type Nearby = { slug: string; name: string; city: string | null; country: string | null; distKm: number };

export default function NearbySpotBanner() {
  const [nearby, setNearby] = useState<Nearby | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    let cancelled = false;
    (async () => {
      try {
        const perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
        if (perm && perm.state !== "granted") return; // don't prompt
      } catch {
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          const dLat = 0.1; // ~11km
          const dLng = 0.1 / Math.cos((latitude * Math.PI) / 180);
          const { data } = await supabase
            .from("spots")
            .select("slug, name, city, country, lat, lng")
            .gte("lat", latitude - dLat)
            .lte("lat", latitude + dLat)
            .gte("lng", longitude - dLng)
            .lte("lng", longitude + dLng)
            .limit(30);
          if (!data || cancelled) return;
          let best: Nearby | null = null;
          for (const s of data as any[]) {
            if (typeof s.lat !== "number" || typeof s.lng !== "number") continue;
            const d = haversineKm(latitude, longitude, s.lat, s.lng);
            if (d <= RADIUS_KM && (!best || d < best.distKm)) {
              best = { slug: s.slug, name: s.name, city: s.city, country: s.country, distKm: d };
            }
          }
          if (best) setNearby(best);
        },
        () => {},
        { maximumAge: 5 * 60 * 1000, timeout: 8000 }
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setNearby(null);
  };

  return (
    <AnimatePresence>
      {nearby && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="glass border border-amber/40 rounded-2xl px-4 py-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-amber/15 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-amber" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground truncate">
              You're near <span className="font-medium">{nearby.name}</span> ({nearby.distKm.toFixed(1)} km away)
            </div>
            <div className="text-[11px] text-muted-foreground">Mark it visited from the spot page.</div>
          </div>
          <a
            href={`/spot/${nearby.slug}`}
            className="text-xs font-medium text-amber hover:underline whitespace-nowrap"
          >
            Open
          </a>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
