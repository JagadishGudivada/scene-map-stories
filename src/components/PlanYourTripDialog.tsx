import { ReactNode, useEffect, useState } from "react";
import { Plane, Hotel, MapPin, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PlanYourTripDialogProps {
  /** The location/city name shown as the subtitle. */
  locationName: string;
  /** Optional spot/landmark name for more specific search queries. */
  spotName?: string;
  /** Latitude of the spot — enables Google Maps directions. */
  lat?: number;
  /** Longitude of the spot — enables Google Maps directions. */
  lng?: number;
  /** Optional: the trigger element. If omitted, a default amber button is rendered. */
  trigger?: ReactNode;
  /** Optional className applied to the default trigger button. */
  triggerClassName?: string;
}

interface ActionCard {
  icon: ReactNode;
  emoji: string;
  label: string;
  description: string;
  href: string;
}

// Default origin when user location/airport is unknown.
const DEFAULT_ORIGIN_AIRPORT = "LHR";
const DEFAULT_ORIGIN_LABEL = "London (LHR)";

export default function PlanYourTripDialog({
  locationName,
  spotName,
  lat,
  lng,
  trigger,
  triggerClassName,
}: PlanYourTripDialogProps) {
  const [open, setOpen] = useState(false);
  const [originLabel, setOriginLabel] = useState<string>(DEFAULT_ORIGIN_LABEL);
  const [originQuery, setOriginQuery] = useState<string>(DEFAULT_ORIGIN_AIRPORT);
  const [detectingOrigin, setDetectingOrigin] = useState(false);

  // Try to detect the user's nearest city via reverse geocoding once the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (originLabel !== DEFAULT_ORIGIN_LABEL) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    setDetectingOrigin(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data?.address?.city ||
              data?.address?.town ||
              data?.address?.state ||
              data?.address?.country;
            if (city) {
              setOriginLabel(city);
              setOriginQuery(city);
            }
          }
        } catch {
          // ignore — keep LHR default
        } finally {
          setDetectingOrigin(false);
        }
      },
      () => setDetectingOrigin(false),
      { timeout: 4000, maximumAge: 1000 * 60 * 60 },
    );
  }, [open, originLabel]);

  const destinationQuery = spotName ? `${spotName}, ${locationName}` : locationName;
  const flightsUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Flights from ${originQuery} to ${locationName}`,
  )}`;
  const hotelsUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
    destinationQuery,
  )}`;
  const directionsUrl =
    typeof lat === "number" && typeof lng === "number"
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationQuery)}`;

  const cards: ActionCard[] = [
    {
      icon: <Plane className="w-5 h-5" />,
      emoji: "✈️",
      label: "Find Flights",
      description: `From ${originLabel} → ${locationName}`,
      href: flightsUrl,
    },
    {
      icon: <Hotel className="w-5 h-5" />,
      emoji: "🏨",
      label: "Find Hotels",
      description: `Stays near ${spotName ?? locationName}`,
      href: hotelsUrl,
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      emoji: "📍",
      label: "Get Directions",
      description: lat && lng ? "Open route in Google Maps" : "Open in Google Maps",
      href: directionsUrl,
    },
  ];

  const defaultTrigger = (
    <button
      className={
        triggerClassName ??
        "relative overflow-hidden px-8 py-4 rounded-full bg-gradient-amber text-charcoal font-bold hover:brightness-110 hover:scale-[1.02] transition-all shadow-amber"
      }
    >
      <span className="relative z-10">Plan Your Trip 🗺️</span>
      <div className="absolute inset-0 shimmer-sweep pointer-events-none" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl glass border-border/40">
        <DialogHeader className="text-left space-y-2">
          <DialogTitle
            className="font-serif italic text-foreground"
            style={{ fontSize: "28px", lineHeight: 1.1, letterSpacing: "-0.02em" }}
          >
            Plan Your Trip
          </DialogTitle>
          <p className="text-amber" style={{ fontSize: "16px", fontWeight: 600 }}>
            {spotName ? `${spotName} · ${locationName}` : locationName}
          </p>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            {detectingOrigin ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Detecting your location…
              </>
            ) : (
              <>Origin: {originLabel}</>
            )}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {cards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative glass rounded-xl p-5 border-l-2 border-transparent hover:border-amber transition-all duration-200 hover:scale-[1.02] flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {card.emoji}
                </span>
                <span className="text-amber">{card.icon}</span>
              </div>
              <div className="text-base font-semibold text-foreground">{card.label}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {card.description}
              </div>
              <span className="absolute bottom-3 right-4 text-xs font-medium text-amber/80 group-hover:text-amber inline-flex items-center gap-1 transition-colors">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
