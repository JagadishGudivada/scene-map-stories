import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Bed, CheckCircle2, Plane, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { MapPin } from "@/components/LeafletMap";
import { useBeenHereSpot, useSavedSpot } from "@/hooks/useSaved";

interface SpotActionsModalProps {
  pin: MapPin | null;
  onClose: () => void;
}

function slugifySpot(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function toQueryValue(value: string) {
  return encodeURIComponent(value.trim().replace(/\s+/g, " "));
}

export default function SpotActionsModal({ pin, onClose }: SpotActionsModalProps) {
  const spotSlug = useMemo(() => (pin ? slugifySpot(pin.label) : ""), [pin]);
  const locationQuery = useMemo(() => {
    if (!pin) return "";
    return pin.city || pin.title || pin.label;
  }, [pin]);

  const flightsUrl = useMemo(() => {
    if (!locationQuery) return "https://www.google.com/flights";
    return `https://www.google.com/flights?q=${toQueryValue(`flights to ${locationQuery}`)}`;
  }, [locationQuery]);

  const hotelsUrl = useMemo(() => {
    if (!locationQuery) return "https://www.google.com/travel/hotels";
    return `https://www.google.com/travel/hotels/${toQueryValue(locationQuery)}`;
  }, [locationQuery]);

  const { saved: spotSaved, toggle: toggleSaveSpot, loading: saveSpotLoading } = useSavedSpot(spotSlug);
  const { visited: beenHere, toggle: toggleBeenHere, loading: beenHereLoading } = useBeenHereSpot(
    spotSlug,
    pin
      ? {
          spotName: pin.label,
          lat: pin.lat,
          lng: pin.lng,
          city: pin.city || "Unknown City",
          country: pin.country || "Unknown Country",
          type: pin.type,
        }
      : undefined
  );

  return (
    <AnimatePresence>
      {pin && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 w-auto sm:w-[340px] glass rounded-2xl border border-border/70 bg-background/95 shadow-float p-4"
          role="dialog"
          aria-label={pin.label}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="pr-6 mb-3">
            <p className="font-serif text-lg leading-tight text-foreground truncate">{pin.label}</p>
            <p className="text-xs text-muted-foreground truncate">{pin.title || pin.city || "Quick actions"}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleSaveSpot}
              disabled={!spotSlug || saveSpotLoading}
              className={`h-9 px-2 rounded-lg font-semibold text-xs transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                spotSaved
                  ? "glass border border-amber/40 text-amber"
                  : "bg-gradient-amber text-charcoal hover:opacity-90"
              }`}
            >
              {spotSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              {spotSaved ? "Saved" : "Save"}
            </button>

            <button
              onClick={toggleBeenHere}
              disabled={!spotSlug || beenHereLoading}
              className={`h-9 px-2 rounded-lg border font-medium text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                beenHere
                  ? "bg-teal/15 border-teal/40 text-teal"
                  : "glass border-border text-foreground hover:bg-muted/50"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {beenHere ? "Visited" : "Been Here"}
            </button>

            <a
              href={flightsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-2 rounded-lg glass border border-border text-foreground hover:bg-muted/50 transition-all flex items-center justify-center gap-1.5 text-xs"
            >
              <Plane className="w-3.5 h-3.5" />
              Flights
            </a>

            <a
              href={hotelsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-2 rounded-lg glass border border-border text-foreground hover:bg-muted/50 transition-all flex items-center justify-center gap-1.5 text-xs"
            >
              <Bed className="w-3.5 h-3.5" />
              Hotels
            </a>
          </div>

          {spotSlug && (
            <Link
              to={`/spot/${spotSlug}`}
              onClick={onClose}
              className="mt-3 inline-block text-xs text-amber hover:text-amber/80 transition-colors"
            >
              View Full Details →
            </Link>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
