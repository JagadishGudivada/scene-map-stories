import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Radar,
  MapPin,
  Loader2,
  Navigation,
  Crosshair,
  X,
  Film,
  Tv,
  BookOpen,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { allMapPins } from "@/lib/mapData";
import { toast } from "@/hooks/use-toast";

interface RadarSpot {
  slug?: string;
  name: string;
  city?: string;
  country?: string;
  lat: number;
  lng: number;
  image?: string;
  type: "Movie" | "Series" | "Book";
  title?: string;
  distanceKm: number;
}

const EARTH_KM = 6371;
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

const RADIUS_PRESETS = [
  { label: "1 km", value: 1 },
  { label: "5 km", value: 5 },
  { label: "25 km", value: 25 },
  { label: "100 km", value: 100 },
  { label: "500 km", value: 500 },
];

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1489599735734-79b4169c2a78?w=600&q=80";

function formatKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function typeIcon(t: RadarSpot["type"]) {
  if (t === "Series") return Tv;
  if (t === "Book") return BookOpen;
  return Film;
}

interface SpotRadarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SpotRadarDialog({ open, onOpenChange }: SpotRadarDialogProps) {
  const navigate = useNavigate();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "denied" | "ok">("idle");
  const [allSpots, setAllSpots] = useState<RadarSpot[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [typeFilter, setTypeFilter] = useState<"All" | "Movie" | "Series" | "Book">("All");

  // Geolocate when opened
  useEffect(() => {
    if (!open || coords) return;
    if (!("geolocation" in navigator)) {
      setLocStatus("denied");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }, [open, coords]);

  // Load seed pool: mock pins + DB spots (once)
  useEffect(() => {
    if (!open || allSpots.length) return;
    let cancelled = false;
    setLoadingDb(true);

    (async () => {
      const seeded: RadarSpot[] = allMapPins
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => ({
          name: p.label,
          city: p.city,
          country: p.country,
          lat: p.lat,
          lng: p.lng,
          image: p.image,
          type: p.type,
          title: p.title,
          distanceKm: 0,
        }));

      try {
        const { data, error } = await supabase
          .from("spots")
          .select("id, slug, name, city, country, lat, lng, image_url, data")
          .not("lat", "is", null)
          .not("lng", "is", null)
          .limit(1000);

        if (!error && data) {
          for (const s of data as any[]) {
            if (s.lat == null || s.lng == null) continue;
            // Dedupe by proximity
            const dup = seeded.some(
              (m) => Math.abs(m.lat - s.lat) < 0.005 && Math.abs(m.lng - s.lng) < 0.005
            );
            if (dup) continue;
            const titles = Array.isArray(s.data?.titles) ? s.data.titles : [];
            const firstTitle =
              typeof titles[0] === "string" ? titles[0] : titles[0]?.title;
            seeded.push({
              slug: s.slug,
              name: s.name,
              city: s.city || undefined,
              country: s.country || undefined,
              lat: s.lat,
              lng: s.lng,
              image: s.image_url || undefined,
              type: "Movie",
              title: firstTitle,
              distanceKm: 0,
            });
          }
        }
      } catch (e) {
        // ignore — mock pool still works
      }

      if (!cancelled) {
        setAllSpots(seeded);
        setLoadingDb(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, allSpots.length]);

  const nearby = useMemo<RadarSpot[]>(() => {
    if (!coords) return [];
    return allSpots
      .map((s) => ({
        ...s,
        distanceKm: haversineKm(coords.lat, coords.lng, s.lat, s.lng),
      }))
      .filter((s) => s.distanceKm <= radiusKm)
      .filter((s) => typeFilter === "All" || s.type === typeFilter)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 60);
  }, [allSpots, coords, radiusKm, typeFilter]);

  const handleRetryLocation = useCallback(() => {
    setCoords(null);
    setLocStatus("idle");
  }, []);

  const openInMaps = useCallback((s: RadarSpot) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const goToSpot = useCallback(
    (s: RadarSpot) => {
      if (s.slug) {
        onOpenChange(false);
        navigate(`/spot/${s.slug}`);
      } else {
        onOpenChange(false);
        navigate(`/map?lat=${s.lat}&lng=${s.lng}&zoom=14`);
      }
    },
    [navigate, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-teal mb-1.5">
            <Radar className="w-3.5 h-3.5" />
            <span>Spot Radar</span>
            {coords && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground normal-case tracking-normal">
                {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
              </span>
            )}
          </div>
          <DialogTitle className="font-serif text-2xl sm:text-3xl text-foreground text-left leading-tight">
            Filming spots near you
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Every on-screen location within reach — sorted by distance.
          </p>
        </DialogHeader>

        {/* Controls */}
        <div className="px-4 sm:px-5 py-3 border-b border-border space-y-2.5 bg-muted/10">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {RADIUS_PRESETS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRadiusKm(r.value)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                  radiusKm === r.value
                    ? "bg-teal/15 border-teal/40 text-teal"
                    : "glass border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
            <div className="w-px h-5 bg-border shrink-0 mx-1" />
            {(["All", "Movie", "Series", "Book"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === t
                    ? "bg-amber/15 border-amber/40 text-amber"
                    : "glass border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 no-scrollbar">
          {locStatus === "loading" && (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-teal mx-auto animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Pinging your coordinates…</p>
            </div>
          )}

          {locStatus === "denied" && (
            <div className="py-12 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="font-serif text-lg text-foreground mb-1">
                Location unavailable
              </p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                Allow location access in your browser to scan filming spots around you.
              </p>
              <button
                onClick={handleRetryLocation}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-teal/15 border border-teal/40 text-teal text-xs font-medium hover:bg-teal/25 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Try again
              </button>
            </div>
          )}

          {locStatus === "ok" && (
            <>
              {loadingDb && nearby.length === 0 ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-7 h-7 text-amber mx-auto animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">Scanning the area…</p>
                </div>
              ) : nearby.length === 0 ? (
                <div className="py-16 text-center">
                  <Crosshair className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-serif text-lg text-foreground mb-1">
                    Nothing within {formatKm(radiusKm)}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Try widening the radius or switching media type.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {nearby.map((s, i) => {
                      const Icon = typeIcon(s.type);
                      return (
                        <motion.li
                          key={`${s.lat}-${s.lng}-${i}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18, delay: Math.min(i, 12) * 0.015 }}
                          className="group flex items-stretch gap-3 p-2.5 rounded-xl glass border border-border hover:border-teal/40 transition-colors"
                        >
                          <button
                            onClick={() => goToSpot(s)}
                            className="shrink-0 relative w-16 h-16 rounded-lg overflow-hidden bg-muted"
                          >
                            <img
                              src={s.image || FALLBACK_IMG}
                              alt={s.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 text-[9px] font-mono text-white">
                              <Icon className="w-2.5 h-2.5" />
                            </span>
                          </button>

                          <button
                            onClick={() => goToSpot(s)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="text-sm font-medium text-foreground truncate">
                              {s.name}
                            </p>
                            {s.title && (
                              <p className="text-[11px] text-amber/90 truncate mt-0.5">
                                {s.title}
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5 inline-flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                            </p>
                          </button>

                          <div className="shrink-0 flex flex-col items-end justify-between py-0.5">
                            <span className="font-mono text-xs text-teal font-semibold">
                              {formatKm(s.distanceKm)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openInMaps(s)}
                                title="Open in Google Maps"
                                className="w-7 h-7 rounded-full glass border border-border hover:border-amber/40 hover:text-amber text-muted-foreground flex items-center justify-center transition-colors"
                              >
                                <Navigation className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => goToSpot(s)}
                                title="View spot"
                                className="w-7 h-7 rounded-full glass border border-border hover:border-teal/40 hover:text-teal text-muted-foreground flex items-center justify-center transition-colors"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {locStatus === "ok" && nearby.length > 0 && (
          <div className="px-4 sm:px-5 py-2.5 border-t border-border flex items-center justify-between bg-background/80 backdrop-blur">
            <span className="text-[11px] text-muted-foreground">
              {nearby.length} spot{nearby.length === 1 ? "" : "s"} within {formatKm(radiusKm)}
            </span>
            <button
              onClick={() => {
                onOpenChange(false);
                if (coords) navigate(`/map?lat=${coords.lat}&lng=${coords.lng}&zoom=11`);
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-gradient-amber text-charcoal font-bold text-xs shadow-amber hover:opacity-90 transition-opacity"
            >
              See on map <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
