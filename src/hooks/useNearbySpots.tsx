import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MapPin } from "@/components/LeafletMap";
import { allMapPins } from "@/lib/mapData";

interface SpotRow {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  data: any;
}

interface NearbyPin extends MapPin {
  slug?: string;
  distanceKm: number;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function useNearbySpots(
  center: { lat: number; lng: number } | null,
  radiusKm: number,
  enabled: boolean
) {
  const [allSpots, setAllSpots] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (allSpots.length > 0) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("spots")
          .select("id, slug, name, city, country, lat, lng, image_url, data")
          .not("lat", "is", null)
          .not("lng", "is", null)
          .limit(1000);

        if (error) throw error;

        const dbPins: MapPin[] = (data as SpotRow[] | null || [])
          .filter((s) => s.lat != null && s.lng != null)
          .map((s) => {
            const titles = Array.isArray(s.data?.titles) ? s.data.titles : [];
            const firstTitle = typeof titles[0] === "string" ? titles[0] : titles[0]?.title;
            return {
              lat: s.lat as number,
              lng: s.lng as number,
              label: s.name,
              title: firstTitle || s.city || undefined,
              city: s.city || undefined,
              country: s.country || undefined,
              type: "Movie" as const,
              image: s.image_url || undefined,
            };
          });

        // Merge with mock pins for richer coverage; dedupe by proximity
        const merged: MapPin[] = [...dbPins];
        for (const p of allMapPins) {
          const exists = merged.some(
            (m) => Math.abs(m.lat - p.lat) < 0.005 && Math.abs(m.lng - p.lng) < 0.005
          );
          if (!exists) merged.push(p);
        }

        if (!cancelled) setAllSpots(merged);
      } catch (err) {
        console.error("Failed to load nearby spots:", err);
        if (!cancelled) setAllSpots(allMapPins);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, allSpots.length]);

  const nearbyPins = useMemo<NearbyPin[]>(() => {
    if (!center || !enabled) return [];
    return allSpots
      .map((p) => ({
        ...p,
        distanceKm: haversineKm(center.lat, center.lng, p.lat, p.lng),
      }))
      .filter((p) => p.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [allSpots, center, radiusKm, enabled]);

  return { nearbyPins, loading };
}
