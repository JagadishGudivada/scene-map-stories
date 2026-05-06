import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Bed, CheckCircle2, Plane } from "lucide-react";
import type { MapPin } from "@/components/LeafletMap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={!!pin} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-md rounded-2xl border border-border/70 bg-background/95 p-5 sm:p-6">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-foreground font-serif text-2xl">{pin?.label || "Location"}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {pin?.title || pin?.city || "Choose a quick action"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={toggleSaveSpot}
            disabled={!spotSlug || saveSpotLoading}
            className={`h-11 px-4 rounded-xl font-bold text-sm transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 ${
              spotSaved
                ? "glass border border-amber/40 text-amber hover:bg-muted/50"
                : "bg-gradient-amber text-charcoal hover:opacity-90 shadow-amber"
            }`}
          >
            {spotSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {spotSaved ? "Saved" : "Save Spot"}
          </button>

          <button
            onClick={toggleBeenHere}
            disabled={!spotSlug || beenHereLoading}
            className={`h-11 px-4 rounded-xl border font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              beenHere
                ? "bg-teal/15 border-teal/40 text-teal hover:bg-teal/20"
                : "glass border-border text-foreground hover:bg-muted/50"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {beenHere ? "Been Here" : "I've Been Here"}
          </button>

          <a
            href={flightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-4 rounded-xl glass border border-border text-foreground hover:bg-muted/50 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Plane className="w-4 h-4" />
            Flights
          </a>

          <a
            href={hotelsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-4 rounded-xl glass border border-border text-foreground hover:bg-muted/50 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Bed className="w-4 h-4" />
            Hotels
          </a>
        </div>

        {spotSlug && (
          <div className="pt-1">
            <Link
              to={`/spot/${spotSlug}`}
              onClick={onClose}
              className="text-sm text-amber hover:text-amber/80 transition-colors"
            >
              View Full Details →
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
