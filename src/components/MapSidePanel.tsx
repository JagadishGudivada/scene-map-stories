import { useMemo } from "react";
import { motion } from "framer-motion";
import { X, MapPin, Film, Tv, BookOpen, ExternalLink, Bookmark, Camera, Navigation } from "lucide-react";
import type { MapPin as MapPinType } from "@/components/LeafletMap";
import type { MediaType } from "@/lib/mockData";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const typeColorMap: Record<MediaType, string> = {
  Movie: "bg-amber/15 text-amber",
  Series: "bg-teal/15 text-teal",
  Book: "bg-purple-400/15 text-purple-400",
};

const visitorPhotos = [
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1506377585622-bedcbb5f6789?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=200&h=200&fit=crop",
];

function getDistance(a: MapPinType, b: MapPinType): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface MapSidePanelProps {
  pin: MapPinType;
  allPins: MapPinType[];
  onClose: () => void;
  onSelectPin: (pin: MapPinType) => void;
}

export default function MapSidePanel({ pin, allPins, onClose, onSelectPin }: MapSidePanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const nearbyLocations = useMemo(() => {
    return allPins
      .filter((p) => p !== pin && !(p.lat === pin.lat && p.lng === pin.lng))
      .map((p) => ({ pin: p, distance: getDistance(pin, p) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
  }, [pin, allPins]);

  // Deterministic photo selection based on pin label
  const photos = useMemo(() => {
    const seed = pin.label.charCodeAt(0) + pin.label.length;
    return Array.from({ length: 6 }, (_, i) => visitorPhotos[(seed + i) % visitorPhotos.length]);
  }, [pin.label]);

  const handleSaveToMap = () => {
    if (!user) {
      navigate("/auth?redirect=/map");
      return;
    }
    toast.success(`${pin.label} saved to your Memory Map`, {
      description: `From "${pin.title}"`,
    });
  };

  const TypeIcon = pin.type === "Movie" ? Film : pin.type === "Series" ? Tv : BookOpen;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] z-[1100] pt-16 flex flex-col"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-xl glass border border-border hover:bg-muted/50 transition-colors"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      {/* Location image */}
      <div className="relative h-56 sm:h-60 shrink-0 overflow-hidden">
        <img
          src={pin.image || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop"}
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
          {pin.title && (
            <p className="text-sm text-muted-foreground mt-1">
              Featured in <span className="text-amber font-medium">{pin.title}</span>
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
          Discover this iconic filming location from{" "}
          <span className="text-foreground font-medium">{pin.title}</span>. Visit the real-world
          spot and capture your own cinematic moment.
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
            <span className="text-xs text-muted-foreground ml-auto">24 photos</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((src, i) => (
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
          </div>
        </div>

        {/* Nearby Locations */}
        {nearbyLocations.length > 0 && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-4 h-4 text-amber" />
              <h3 className="text-sm font-medium text-foreground">Nearby Locations</h3>
            </div>
            <div className="space-y-1.5">
              {nearbyLocations.map(({ pin: nearby, distance }, i) => {
                const NearbyIcon = nearby.type === "Movie" ? Film : nearby.type === "Series" ? Tv : BookOpen;
                return (
                  <button
                    key={`${nearby.lat}-${nearby.lng}-${i}`}
                    onClick={() => onSelectPin(nearby)}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColorMap[nearby.type]}`}>
                      <NearbyIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{nearby.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{nearby.title}</p>
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
    </motion.div>
  );
}
