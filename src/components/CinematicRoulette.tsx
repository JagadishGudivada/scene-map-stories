import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, MapPin, Sparkles, X, Share2, Map as MapIcon, RotateCcw, Film, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { allMapPins } from "@/lib/mapData";
import { DEFAULT_PEXELS_IMAGE, fetchPexelsImage } from "@/lib/pexels";
import type { MapPin as MapPinType } from "@/components/LeafletMap";
import { toast } from "@/hooks/use-toast";

interface RouletteSpot {
  slug?: string;
  name: string;
  title?: string;
  type?: string;
  city?: string;
  country?: string;
  image?: string;
  lat: number;
  lng: number;
}

const FALLBACK_IMG = DEFAULT_PEXELS_IMAGE;

function getSpotImageQuery(spot: RouletteSpot): string {
  return [spot.name, spot.city, spot.country, spot.title].filter(Boolean).join(" ");
}

const TEASERS = [
  "Spin the reel",
  "Surprise me",
  "Roll the dice",
  "Take me somewhere",
  "Find me a scene",
];

const VIBE_BLURBS = [
  "the kind of place a film crew kept secret",
  "a frame you've scrolled past a hundred times",
  "an on-screen moment that hits different in person",
  "where a scene lives outside the screen",
  "the spot a director chose for a reason",
];

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function slugifyName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function CinematicRoulette() {
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spot, setSpot] = useState<RouletteSpot | null>(null);
  const [pool, setPool] = useState<RouletteSpot[]>([]);
  const [teaserIdx, setTeaserIdx] = useState(0);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [reelFrames, setReelFrames] = useState<RouletteSpot[]>([]);
  const dbLoadedRef = useRef(false);

  // Rotate teaser copy
  useEffect(() => {
    const i = setInterval(() => setTeaserIdx((n) => (n + 1) % TEASERS.length), 3500);
    return () => clearInterval(i);
  }, []);

  // Seed pool from mockData immediately (only with images)
  useEffect(() => {
    setPool(
      allMapPins
        .filter((p) => !!p.image)
        .map((p: MapPinType) => ({
          name: p.label,
          title: p.title,
          type: p.type,
          image: p.image,
          lat: p.lat,
          lng: p.lng,
          city: (p as any).city,
          country: (p as any).country,
        }))
    );
  }, []);

  const enrichFromDb = useCallback(async () => {
    if (dbLoadedRef.current) return;
    dbLoadedRef.current = true;
    try {
      const { data } = await supabase
        .from("spots")
        .select("slug, name, city, country, lat, lng, image_url, data")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .not("image_url", "is", null)
        .limit(300);
      if (!data?.length) return;
      const dbSpots: RouletteSpot[] = (data as any[])
        .filter((s) => s.lat && s.lng)
        .map((s) => {
          const titles = Array.isArray(s.data?.titles) ? s.data.titles : [];
          const firstTitle =
            typeof titles[0] === "string" ? titles[0] : titles[0]?.title;
          return {
            slug: s.slug,
            name: s.name,
            title: firstTitle,
            city: s.city || undefined,
            country: s.country || undefined,
            image: s.image_url || undefined,
            lat: s.lat,
            lng: s.lng,
          };
        });
      setPool((prev) => [...dbSpots, ...prev]);
    } catch {
      // silent — fallback pool already works
    }
  }, []);

  const pickRandom = useCallback(
    (avoid?: string): RouletteSpot | null => {
      if (!pool.length) return null;
      for (let i = 0; i < 6; i++) {
        const candidate = pool[Math.floor(Math.random() * pool.length)];
        if (!avoid || candidate.name !== avoid) return candidate;
      }
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [pool]
  );

  const hydrateSpotImage = useCallback(async (candidate: RouletteSpot | null): Promise<RouletteSpot | null> => {
    if (!candidate) return null;
    const pexelsImage = await fetchPexelsImage(getSpotImageQuery(candidate));
    const resolvedImage = pexelsImage || candidate.image || FALLBACK_IMG;

    setPool((prev) =>
      prev.map((p) =>
        p.lat === candidate.lat && p.lng === candidate.lng && p.name === candidate.name
          ? { ...p, image: resolvedImage }
          : p
      )
    );

    return { ...candidate, image: resolvedImage };
  }, []);

  const spin = useCallback(() => {
    if (!pool.length) return;
    setSpinning(true);
    setSpot(null);
    // Build a reel of 6 spots that scroll past, last one is the result
    const reel: RouletteSpot[] = [];
    for (let i = 0; i < 5; i++) {
      const r = pickRandom();
      if (r) reel.push(r);
    }
    const final = pickRandom(reel.at(-1)?.name);
    if (final) reel.push(final);
    setReelFrames(reel);

    // Resolve reel images by place name so visuals match the selected locations.
    void Promise.all(reel.map((frame) => hydrateSpotImage(frame))).then((resolvedFrames) => {
      setReelFrames(resolvedFrames.filter((frame): frame is RouletteSpot => !!frame));
    });

    window.setTimeout(() => {
      void hydrateSpotImage(final)
        .then((resolvedFinal) => setSpot(resolvedFinal))
        .finally(() => setSpinning(false));
    }, 1400);
  }, [pool, pickRandom, hydrateSpotImage]);

  const openAndSpin = useCallback(() => {
    setOpen(true);
    enrichFromDb();
    // Ask for geolocation lazily, non-blocking
    if (!userLoc && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { timeout: 4000, maximumAge: 60 * 60 * 1000 }
      );
    }
    setTimeout(spin, 60);
  }, [enrichFromDb, spin, userLoc]);

  const distanceLabel = useMemo(() => {
    if (!spot || !userLoc) return null;
    const km = haversineKm(userLoc, { lat: spot.lat, lng: spot.lng });
    if (km < 1) return "right where you are";
    if (km < 1000) return `${Math.round(km)} km away`;
    return `${(km / 1000).toFixed(1)}k km away`;
  }, [spot, userLoc]);

  const blurb = useMemo(
    () => VIBE_BLURBS[Math.floor(Math.random() * VIBE_BLURBS.length)],
    [spot?.name]
  );

  const handleShare = useCallback(async () => {
    if (!spot) return;
    const text = `${spot.name}${spot.city ? `, ${spot.city}` : ""} — featured in ${spot.title || "a film"}. Spun on Sarevista.`;
    const url = window.location.origin + (spot.slug ? `/spot/${spot.slug}` : "/map");
    try {
      if (navigator.share) {
        await navigator.share({ title: spot.name, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast({ title: "Link copied", description: "Share it with your crew." });
      }
    } catch {
      // user cancelled
    }
  }, [spot]);

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 240, damping: 18 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        onClick={openAndSpin}
        aria-label="Cinematic Roulette: spin for a random filming spot"
        className="group fixed z-40 bottom-20 right-4 sm:bottom-6 sm:right-6 h-14 pl-4 pr-5 rounded-full bg-foreground text-background shadow-2xl shadow-foreground/30 flex items-center gap-2.5 overflow-hidden ring-1 ring-foreground/20"
      >
        {/* Shimmer sweep */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-amber/30 to-transparent" />
        <motion.span
          animate={{ rotate: [0, -10, 10, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
          className="relative"
        >
          <Dices className="w-5 h-5 text-amber" />
        </motion.span>
        <div className="relative flex flex-col items-start leading-tight">
          <span className="text-[9px] uppercase tracking-widest text-background/60 font-mono">
            roulette
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={teaserIdx}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-semibold"
            >
              {TEASERS[teaserIdx]}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xl" />
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber" />
                  <span className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
                    Cinematic Roulette
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Reel / Result */}
              <div className="relative h-[260px] sm:h-[300px] bg-muted/30 overflow-hidden">
                {spinning ? (
                  <motion.div
                    key="roulette-spinning-reel"
                    initial={{ y: 0 }}
                    animate={{ y: `-${(reelFrames.length - 1) * 100}%` }}
                    transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col w-full"
                    style={{ height: `${reelFrames.length * 100}%` }}
                  >
                    {reelFrames.map((f, i) => (
                      <div
                        key={i}
                        className="w-full relative shrink-0"
                        style={{ height: `${100 / reelFrames.length}%` }}
                      >
                        {f.image ? (
                          <img
                            src={f.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                            }}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/0" />
                        <div className="absolute bottom-4 left-5 right-5 text-foreground">
                          <p className="font-serif text-xl line-clamp-1">{f.name}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : spot ? (
                  <motion.div
                    key={`roulette-result-${spot.slug || spot.name}`}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                  >
                    <img
                      src={spot.image || FALLBACK_IMG}
                      alt={spot.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                    {/* Grain */}
                    <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none [background-image:radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:3px_3px]" />
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Compass className="w-8 h-8 text-muted-foreground animate-pulse" />
                  </div>
                )}

                {/* Top reel marker */}
                {spinning && (
                  <>
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-amber/60 z-10" />
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-amber z-10" />
                  </>
                )}
              </div>

              {/* Detail */}
              <div className="px-5 pt-4 pb-5">
                <AnimatePresence mode="wait">
                  {spot && !spinning ? (
                    <motion.div
                      key={spot.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                        <MapPin className="w-3 h-3 text-amber" />
                        <span className="line-clamp-1">
                          {[spot.city, spot.country].filter(Boolean).join(", ") ||
                            "On the cinematic map"}
                        </span>
                        {distanceLabel && (
                          <>
                            <span className="text-border">•</span>
                            <span className="text-amber">{distanceLabel}</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-serif text-2xl text-foreground leading-tight mb-2">
                        {spot.name}
                      </h3>
                      {spot.title && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                          <Film className="w-3 h-3" />
                          <span>
                            featured in{" "}
                            <span className="text-foreground font-medium">
                              {spot.title}
                            </span>
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground italic mb-4">
                        "{blurb}."
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={spin}
                          className="h-11 px-4 rounded-full glass border border-border text-sm font-medium flex items-center gap-2 hover:bg-muted transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Spin again
                        </button>
                        <Link
                          to={
                            spot.slug
                              ? `/spot/${spot.slug}`
                              : `/map?lat=${spot.lat}&lng=${spot.lng}`
                          }
                          onClick={() => setOpen(false)}
                          className="flex-1 h-11 px-4 rounded-full bg-foreground text-background text-sm font-semibold flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
                        >
                          <MapIcon className="w-4 h-4" />
                          Take me there
                        </Link>
                        <button
                          onClick={handleShare}
                          aria-label="Share this spot"
                          className="h-11 w-11 rounded-full glass border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="spinning-copy"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-[148px] flex flex-col items-center justify-center text-center"
                    >
                      <p className="font-serif text-xl text-foreground mb-1">
                        Picking a scene…
                      </p>
                      <p className="text-xs text-muted-foreground">
                        somewhere a camera has been
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
