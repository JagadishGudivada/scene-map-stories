import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, MapPin, Film, Tv, BookOpen, ExternalLink, Bookmark, Camera, Navigation } from "lucide-react";
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

interface MapSidePanelProps {
  pin: MapPinType;
  onClose: () => void;
}

export default function MapSidePanel({ pin, onClose }: MapSidePanelProps) {
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
    if (sameCity.length > 0) {
      return sameCity.slice(0, 4);
    }

    const sameCountry = pinCountry
      ? candidates.filter(({ spot, distance }) => normalizeText(spot.country) === pinCountry && distance <= maxCountryDistanceKm)
      : [];
    if (sameCountry.length > 0) {
      return sameCountry.slice(0, 4);
    }

    return [];
  }, [pin]);

  useEffect(() => {
    let cancelled = false;

    const loadLocationImage = async () => {
      setLocationImage(null);
      setVisitorPhotos([]);

      try {
        const { data, error } = await supabase.functions.invoke("location-photo", {
          body: {
            label: pin.label,
            city: pin.city,
            country: pin.country,
          },
        });

        if (error) throw error;

        const imageUrl = data && typeof data === "object" && "imageUrl" in data
          ? (data.imageUrl as string | null)
          : null;
        const imageUrls = data && typeof data === "object" && "imageUrls" in data && Array.isArray(data.imageUrls)
          ? data.imageUrls.filter((url: unknown): url is string => typeof url === "string" && url.trim().length > 0)
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
    };

    loadLocationImage();

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
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] z-[1100] pt-16 md:pt-20 flex flex-col"
    >
      {/* Inner panel with glass background below nav */}
      <div className="flex-1 flex flex-col glass border-l border-border shadow-float overflow-hidden relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border hover:bg-muted/50 transition-colors"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>

      {/* Location image */}
      <div className="relative h-56 sm:h-60 shrink-0 overflow-hidden">
        <img
          src={locationImage || DEFAULT_PEXELS_IMAGE}
          alt={pin.label}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${typeColorMap[pin.type]}`}>
            <TypeIcon className="w-3 h-3" />
            {pin.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
        {/* Title & subtitle */}
        <div>
          <h2 className="font-serif text-2xl text-foreground">{pin.label}</h2>
          {displayTitle && (
            <p className="text-sm text-muted-foreground mt-1">
              Featured in <span className="text-amber font-medium">{displayTitle}</span>
            </p>
          )}
        </div>

        {/* Coordinates */}
        <div className="flex items-center gap-3 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            {pin.lat.toFixed(4)}°N, {pin.lng.toFixed(4)}°E
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {displayTitle ? (
            <>
              Discover this iconic filming location from{" "}
              <span className="text-foreground font-medium">{displayTitle}</span>. Visit the
              real-world spot and capture your own cinematic moment.
            </>
          ) : (
            "Discover this real-world filming location and capture your own cinematic moment."
          )}
        </p>

        {/* Save to Memory Map */}
        <button
          onClick={handleSaveToMap}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber text-background font-medium text-sm hover:bg-amber/90 transition-colors"
        >
          <Bookmark className="w-4 h-4" />
          Save to Memory Map
        </button>

        {/* Visitor Photos */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-amber" />
            <h3 className="text-sm font-medium text-foreground">Visitor Photos</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {visitorPhotos.length > 0 ? `${visitorPhotos.length} photos` : "No photos"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {visitorPhotos.map((src, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg overflow-hidden group cursor-pointer"
              >
                <img
                  src={src}
                  alt={`Visitor photo ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
            ))}
            {visitorPhotos.length === 0 && (
              <p className="col-span-3 text-xs text-muted-foreground">No place photos available yet.</p>
            )}
          </div>
        </div>

        {/* Nearby Spots */}
        {nearbySpots.length > 0 && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-4 h-4 text-amber" />
              <h3 className="text-sm font-medium text-foreground">Nearby Spots</h3>
            </div>
            <div className="space-y-1.5">
              {nearbySpots.map(({ spot, distance }, i) => {
                const NearbyIcon = spot.type === "Movie" ? Film : spot.type === "Series" ? Tv : BookOpen;
                return (
                  <button
                    key={`${spot.slug}-${spot.lat}-${spot.lng}-${i}`}
                    onClick={() => navigate(`/spot/${spot.slug}`)}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColorMap[spot.type]}`}>
                      <NearbyIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{spot.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{spot.titles[0] || spot.city}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {distance < 100 ? `${distance.toFixed(0)} km` : `${(distance / 1000).toFixed(1)}k km`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Google Maps link */}
        <a
          href={`https://www.google.com/maps/@${pin.lat},${pin.lng},15z`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open in Google Maps
        </a>
      </div>
      </div>
    </motion.div>
  );
}
