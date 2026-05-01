import { ReactNode, useState } from "react";
import { Plane, Hotel, MapPin, ArrowRight } from "lucide-react";
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

export default function PlanYourTripDialog({
  locationName,
  trigger,
  triggerClassName,
}: PlanYourTripDialogProps) {
  const [open, setOpen] = useState(false);

  const cards: ActionCard[] = [
    {
      icon: <Plane className="w-5 h-5" />,
      emoji: "✈️",
      label: "Find Flights",
      description: `Search flights to ${locationName}`,
      href: "https://www.skyscanner.net",
    },
    {
      icon: <Hotel className="w-5 h-5" />,
      emoji: "🏨",
      label: "Find Hotels",
      description: "Browse hotels near the filming location",
      href: "https://www.booking.com",
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      emoji: "📍",
      label: "Get Directions",
      description: "Open in Google Maps",
      href: "https://maps.google.com",
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
          <p
            className="text-amber"
            style={{ fontSize: "16px", fontWeight: 600 }}
          >
            {locationName}
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
              <div className="text-base font-semibold text-foreground">
                {card.label}
              </div>
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
