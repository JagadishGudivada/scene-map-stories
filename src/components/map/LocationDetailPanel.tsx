import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, MapPin, Film, Tv, BookOpen, ExternalLink, Bookmark, Camera, Navigation, Sparkles } from "lucide-react";
import type { MapPin as MapPinType } from "@/components/LeafletMap";
import type { MediaType } from "@/lib/mockData";
import { allFilmingSpots } from "@/lib/filmingSpotsData";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PEXELS_IMAGE } from "@/lib/pexels";
import { isDisplayableTitle } from "@/lib/utils";

const typeColorMap: Record<MediaType, string> = {
  Movie: "bg-amber/15 text-amber",
  Series: "bg-teal/15 text-teal",
  Book: "bg-purple-400/15 text-purple-400",
};

function getDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function normalizeText(value?: string): string {
  return (value || "").trim().toLowerCase();
}

interface LocationDetailPanelProps {
  pin: MapPinType;
  onClose: () => void;
}

/**
 * Cinematic replacement for MapSidePanel on the /map page:
 * - Slow Ken-Burns pan on the hero image
 * - Framer-motion staggered content reveal
 * - Gold-deep primary CTA, ghost secondary
 */
export default function LocationDetailPanel({ pin, onClose }: LocationDetailPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [visitorPhotos, setVisitorPhotos] = useState<string[]>([]);

  const nearbySpots = useMemo(() => {
    const maxCityDistanceKm = 80;
    const maxCountryDistanceKm = 350;
    const pinCity = normalizeText(pin.city);
    const pinCountry = normalizeText(pin.country);

    const candidates = allFilmingSpots
      .filter((spot) => !(spot.lat === pin.lat && spot.lng === pin.lng))
      .map((spot) => ({ spot, distance: getDistance(pin, spot) }))
      .sort((a, b) => a.distance - b.distance);

    const sameCity = pinCity
      ? candidates.filter(({ spot, distance }) => normalizeText(spot.city) === pinCity && distance <= maxCityDistanceKm)
      : [];
    if (sameCity.length > 0) return sameCity.slice(0, 4);

    const sameCountry = pinCountry
      ? candidates.filter(({ spot, distance }) => normalizeText(spot.country) === pinCountry && distance <= maxCountryDistanceKm)
      : [];
    if (sameCountry.length > 0) return sameCountry.slice(0, 4);

    return [];
  }, [pin]);

  useEffect(() => {
    let cancelled = false;
    setLocationImage(null);
    setVisitorPhotos([]);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("location-photo", {
          body: { label: pin.label, city: pin.city, country: pin.country },
        });
        if (error) throw error;
        const imageUrl = data && typeof data === "object" && "imageUrl" in data
          ? (data.imageUrl as string | null)
          : null;
        const imageUrls = data && typeof data === "object" && "imageUrls" in data && Array.isArray(data.imageUrls)
          ? data.imageUrls.filter((u: unknown): u is string => typeof u === "string" && u.trim().length > 0)
          : [];
        if (!cancelled) {
          setLocationImage(imageUrl || null);
          setVisitorPhotos(imageUrls.slice(0, 6));
        }
      } catch {
        if (!cancelled) {
          setLocationImage(null);
          setVisitorPhotos([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pin.label, pin.city, pin.country]);

  const handleSaveToMap = () => {
    if (!user) {
      navigate("/auth?redirect=/map");
      return;
    }
    toast.success(`${pin.label} saved to your Memory Map`, {
      description: displayTitle ? `From "${displayTitle}"` : undefined,
    });
  };

  const TypeIcon = pin.type === "Movie" ? Film : pin.type === "Series" ? Tv : BookOpen;
  const displayTitle = isDisplayableTitle(pin.title) ? pin.title : undefined;

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0.6 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0.5 }}
      transition={{ type: "spring", damping: 30, stiffness: 280 }}
      className="absolute top-0 right-0 bottom-0 w-full sm:w-[440px] z-[1100] pt-16 md:pt-20 flex flex-col"
    >
      <div className="flex-1 flex flex-col glass border-l border-gold-deep/20 shadow-float overflow-hidden relative">
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="absolute top-3 right-3 z-30 p-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border hover:bg-muted/50 transition-colors"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>

        {/* Ken-Burns hero */}
        <div className="relative h-64 shrink-0 overflow-hidden">
          <motion.img
            key={locationImage || "fallback"}
            src={locationImage || DEFAULT_PEXELS_IMAGE}
            alt={pin.label}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            initial={{ scale: 1.02, x: 0, y: 0, opacity: 0 }}
            animate={{
              scale: [1.02, 1.12, 1.02],
              x: [0, -14, 0],
              y: [0, -8, 0],
              opacity: 1,
            }}
            transition={{
              opacity: { duration: 0.6 },
              scale: { duration: 14, repeat: Infinity, ease: "easeInOut" },
              x: { duration: 14, repeat: Infinity, ease: "easeInOut" },
              y: { duration: 14, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          {/* Dark scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          {/* Gold hairline sweep */}
          <motion.div
            className="absolute inset-x-0 bottom-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, #F4C77B, transparent)" }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.9, ease: "easeOut" }}
          />
          <motion.div
            className="absolute bottom-4 left-4 flex items-center gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${typeColorMap[pin.type]}`}>
              <TypeIcon className="w-3 h-3" />
              {pin.type}
            </span>
            {pin.source === "ai" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gold-deep/15 text-gold-soft border border-gold-deep/30">
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            )}
          </motion.div>
        </div>

        {/* Body */}
        <motion.div
          className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
          }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <h2 className="font-serif italic text-2xl text-foreground leading-tight">{pin.label}</h2>
            {displayTitle && (
              <p className="text-sm text-muted-foreground mt-1">
                As seen in <span className="text-gold-soft font-medium">{displayTitle}</span>
              </p>
            )}
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="flex items-center gap-3 text-xs font-mono text-muted-foreground"
          >
            <MapPin className="w-3.5 h-3.5 text-gold-soft shrink-0" />
            <span>{pin.lat.toFixed(4)}°N, {pin.lng.toFixed(4)}°E</span>
            {pin.city && <span className="opacity-60">· {pin.city}</span>}
          </motion.div>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="text-sm text-muted-foreground leading-relaxed"
          >
            {displayTitle ? (
              <>
                Discover this filming location from{" "}
                <span className="text-foreground font-medium">{displayTitle}</span>. Visit the
                real-world spot and capture your own cinematic moment.
              </>
            ) : (
              "Discover this real-world filming location and capture your own cinematic moment."
            )}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="flex flex-col gap-2"
          >
            <button
              onClick={handleSaveToMap}
              className="group relative overflow-hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gold-deep text-background font-medium text-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <Bookmark className="w-4 h-4 relative" />
              <span className="relative">Save to Memory Map</span>
            </button>
            <a
              href={`https://www.google.com/maps/@${pin.lat},${pin.lng},15z`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gold-deep/40 text-foreground font-medium text-sm hover:bg-gold-deep/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Maps
            </a>
          </motion.div>

          {/* Visitor Photos */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="pt-3 border-t border-border"
          >
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-gold-soft" />
              <h3 className="text-sm font-medium text-foreground">Visitor Photos</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {visitorPhotos.length > 0 ? `${visitorPhotos.length} photos` : "—"}
              </span>
            </div>
            {visitorPhotos.length === 0 ? (
              <p className="text-xs text-muted-foreground">No visitor photos yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {visitorPhotos.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i }}
                    className="aspect-square rounded-lg overflow-hidden group cursor-pointer"
                  >
                    <img
                      src={src}
                      alt={`Visitor photo ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Nearby Spots */}
          {nearbySpots.length > 0 && (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              className="pt-3 border-t border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-4 h-4 text-gold-soft" />
                <h3 className="text-sm font-medium text-foreground">Nearby Spots</h3>
              </div>
              <div className="space-y-1.5">
                {nearbySpots.map(({ spot, distance }, i) => {
                  const NearbyIcon = spot.type === "Movie" ? Film : spot.type === "Series" ? Tv : BookOpen;
                  return (
                    <motion.button
                      key={`${spot.slug}-${i}`}
                      whileHover={{ x: 4 }}
                      onClick={() => navigate(`/spot/${spot.slug}`)}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left border-l-2 border-transparent hover:border-gold-deep"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColorMap[spot.type]}`}>
                        <NearbyIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{spot.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{spot.titles[0] || spot.city}</p>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {distance < 100 ? `${distance.toFixed(0)} km` : `${(distance / 1000).toFixed(1)}k km`}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
