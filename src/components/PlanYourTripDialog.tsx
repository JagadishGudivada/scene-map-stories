import { ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AFFILIATE_PARTNERS, type AffiliateCtx } from "@/lib/affiliates";
import { trackAffiliateClick } from "@/lib/trackAffiliateClick";

interface PlanYourTripDialogProps {
  locationName: string;
  spotName?: string;
  lat?: number;
  lng?: number;
  trigger?: ReactNode;
  triggerClassName?: string;
}

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
          /* keep LHR default */
        } finally {
          setDetectingOrigin(false);
        }
      },
      () => setDetectingOrigin(false),
      { timeout: 4000, maximumAge: 1000 * 60 * 60 },
    );
  }, [open, originLabel]);

  const ctx: AffiliateCtx = useMemo(
    () => ({ originLabel, originQuery, locationName, spotName, lat, lng }),
    [originLabel, originQuery, locationName, spotName, lat, lng],
  );

  const handleClick = (partner: string, service: string, url: string) => {
    trackAffiliateClick({
      partner,
      service: service as never,
      spotName,
      locationName,
      origin: originLabel,
      destinationUrl: url,
    });
  };

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
      <DialogContent className="max-w-3xl glass border-border/40 max-h-[90vh] overflow-y-auto">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {AFFILIATE_PARTNERS.map((p) => {
            const url = p.buildUrl(ctx);
            return (
              <a
                key={p.partner}
                href={url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => handleClick(p.partner, p.service, url)}
                onAuxClick={() => handleClick(p.partner, p.service, url)}
                className="group relative glass rounded-xl p-5 border-l-2 border-transparent hover:border-amber transition-all duration-200 hover:scale-[1.02] flex flex-col gap-2 min-h-[140px]"
              >
                <div className="text-2xl" aria-hidden>
                  {p.emoji}
                </div>
                <div className="text-base font-semibold text-foreground">{p.label}</div>
                <div className="text-xs text-muted-foreground leading-relaxed pr-8">
                  {p.description(ctx)}
                </div>
                <span className="absolute bottom-3 right-4 text-xs font-medium text-amber/80 group-hover:text-amber inline-flex items-center gap-1 transition-colors">
                  Open <ArrowRight className="w-3 h-3" />
                </span>
              </a>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground/70 mt-3 text-center">
          Some links are affiliate partnerships — bookings may earn us a small commission at no extra cost to you.
        </p>
      </DialogContent>
    </Dialog>
  );
}
