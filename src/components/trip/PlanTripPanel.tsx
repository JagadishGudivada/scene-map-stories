import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MapPin, Minus, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTripClusters, type TripCluster } from "@/hooks/useTripClusters";
import {
  buildBookingUrl,
  buildFlightsUrl,
  buildGygUrl,
  buildLabel,
  buildViatorUrl,
  type TripDestination,
  type TripPartner,
  type TripSurface,
} from "@/lib/affiliate";
import { airportLabel, getHomeAirport, searchAirports, setHomeAirport } from "@/lib/airports";
import { trackOutboundClick } from "@/lib/trackOutboundClick";
import { cn } from "@/lib/utils";

export type TripTab = "stay" | "fly" | "tours";

export interface FixedDestination extends TripDestination {
  airport?: string;
}

interface PlanTripPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surface: TripSurface;
  initialTab?: TripTab;
  titleSlug?: string;
  titleName?: string;
  posterUrl?: string | null;
  /** Location/spot pages: skip the picker and plan for this place. */
  fixedDestination?: FixedDestination;
}

const TAG_LABEL: Record<string, string> = {
  best_base: "Best base",
  most_iconic: "Most iconic",
  day_trip: "Day trip",
};

const DISCLOSURE = "Sarevista may earn a commission if you book. It doesn't change your price.";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const primaryCls =
  "flex h-11 w-full items-center justify-center rounded-full bg-gold-deep px-5 text-sm font-semibold text-charcoal shadow-card transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const secondaryCls =
  "flex h-11 w-full items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function PlanTripPanel(props: PlanTripPanelProps) {
  const isMobile = useIsMobile();
  const { open, onOpenChange, titleName, fixedDestination } = props;
  const heading = fixedDestination ? "Stay near this spot" : titleName ?? "Plan your trip";
  const sub = fixedDestination ? fixedDestination.name : "Where do you want to base yourself?";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[94dvh] max-h-[94dvh]">
          <DrawerTitle className="sr-only">{heading}</DrawerTitle>
          <DrawerDescription className="sr-only">{sub}</DrawerDescription>
          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">
            <PanelBody {...props} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[520px] max-w-[92vw] overflow-y-auto border-border p-6 sm:max-w-[520px]">
        <SheetTitle className="sr-only">{heading}</SheetTitle>
        <SheetDescription className="sr-only">{sub}</SheetDescription>
        <PanelBody {...props} />
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({
  surface,
  initialTab = "stay",
  titleSlug,
  titleName,
  posterUrl,
  fixedDestination,
}: PlanTripPanelProps) {
  const query = useTripClusters(fixedDestination ? undefined : titleSlug);
  const clusters = query.data?.clusters ?? [];
  const titleId = query.data?.titleId ?? null;
  const poster = posterUrl ?? query.data?.posterUrl ?? null;

  const [tab, setTab] = useState<TripTab>(initialTab);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAlso, setShowAlso] = useState(false);

  useEffect(() => setTab(initialTab), [initialTab]);
  useEffect(() => {
    if (!selectedId && clusters[0]) setSelectedId(clusters[0].id);
  }, [clusters, selectedId]);

  const selected: TripCluster | undefined = clusters.find((c) => c.id === selectedId) ?? clusters[0];
  const top = clusters.slice(0, 5);
  const ukCards = top.filter((c) => c.country_iso2 === "GB");
  const otherCards = ukCards.length ? top.filter((c) => c.country_iso2 !== "GB") : [];
  const mainCards = ukCards.length ? ukCards : top;

  const destination: (TripDestination & { airport?: string; alt: string[]; clusterId: string | null }) | null =
    fixedDestination
      ? { ...fixedDestination, alt: [], clusterId: null }
      : selected
        ? {
            name: selected.name,
            slug: selected.slug,
            lat: selected.lat,
            lng: selected.lng,
            airport: selected.primary_airport ?? undefined,
            alt: selected.alt_airports ?? [],
            clusterId: selected.id,
          }
        : null;

  const loading = !fixedDestination && query.isLoading;
  const failed = !fixedDestination && query.isError;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-4 pr-8">
        {!fixedDestination && (
          <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            {poster && <img src={poster} alt="" className="h-full w-full object-cover" />}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-serif text-2xl italic leading-tight text-foreground">
            {fixedDestination ? "Stay near this spot" : titleName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fixedDestination ? fixedDestination.name : "Where do you want to base yourself?"}
          </p>
        </div>
      </header>

      {loading && (
        <div className="grid gap-3" aria-busy="true" aria-label="Loading destinations">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {failed && (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-foreground">We couldn't load destinations right now.</p>
          <button onClick={() => query.refetch()} className="mt-3 text-sm font-medium text-amber underline-offset-4 hover:underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !failed && !destination && (
        <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          No verified, visitable destinations for this title yet.
        </div>
      )}

      {!fixedDestination && !loading && clusters.length >= 2 && (
        <div role="radiogroup" aria-label="Choose a destination" className="grid gap-3">
          {mainCards.map((c) => (
            <ClusterCard key={c.id} cluster={c} selected={c.id === selected?.id} onSelect={() => setSelectedId(c.id)} />
          ))}
          {otherCards.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlso((v) => !v)}
                aria-expanded={showAlso}
                className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                Also filmed in <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAlso && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {showAlso && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 grid gap-3 overflow-hidden"
                  >
                    {otherCards.map((c) => (
                      <ClusterCard key={c.id} cluster={c} selected={c.id === selected?.id} onSelect={() => setSelectedId(c.id)} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {!fixedDestination && !loading && clusters.length === 1 && selected && (
        <ClusterCard cluster={selected} selected onSelect={() => {}} />
      )}

      {destination && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TripTab)}>
          <TabsList aria-label="Trip planning" className="grid w-full grid-cols-3">
            <TabsTrigger value="stay" aria-label="Stay">Stay</TabsTrigger>
            <TabsTrigger value="fly" aria-label="Fly">Fly</TabsTrigger>
            <TabsTrigger value="tours" aria-label="Tours">Tours</TabsTrigger>
          </TabsList>
          <TabsContent value="stay" className="mt-4">
            <StayTab dest={destination} titleSlug={titleSlug} surface={surface} titleId={titleId} clusterId={destination.clusterId} />
          </TabsContent>
          <TabsContent value="fly" className="mt-4">
            <FlyTab
              to={destination.airport}
              alt={destination.alt}
              destName={destination.name}
              destSlug={destination.slug}
              titleSlug={titleSlug}
              surface={surface}
              titleId={titleId}
              clusterId={destination.clusterId}
            />
          </TabsContent>
          <TabsContent value="tours" className="mt-4">
            <ToursTab dest={destination} titleSlug={titleSlug} surface={surface} titleId={titleId} clusterId={destination.clusterId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ClusterCard({ cluster, selected, onSelect }: { cluster: TripCluster; selected: boolean; onSelect: () => void }) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      layout
      transition={{ duration: 0.2 }}
      className={cn(
        "flex w-full items-stretch gap-3 overflow-hidden rounded-xl border bg-card text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-gold-deep ring-1 ring-gold-deep" : "border-border hover:border-foreground/30",
      )}
    >
      <div className="relative w-24 shrink-0 bg-muted">
        {cluster.hero_image_url ? (
          <img src={cluster.hero_image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-amber" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-3 pr-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-serif text-lg italic leading-tight text-foreground">{cluster.name}</span>
          {cluster.tag && (
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {TAG_LABEL[cluster.tag]}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {cluster.verified_location_count} verified location{cluster.verified_location_count === 1 ? "" : "s"}
          {cluster.radius_minutes ? ` within ${cluster.radius_minutes} min` : ""}
        </p>
      </div>
    </motion.button>
  );
}

interface TabCommon {
  titleSlug?: string;
  surface: TripSurface;
  titleId: string | null;
  clusterId: string | null;
}

function openTracked(partner: TripPartner, label: string, c: TabCommon) {
  trackOutboundClick({ partner, label, surface: c.surface, titleId: c.titleId, clusterId: c.clusterId });
}

function StayTab({ dest, ...c }: TabCommon & { dest: TripDestination }) {
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(2);
  const label = buildLabel(c.titleSlug, dest.slug, c.surface);
  const url = buildBookingUrl(dest, label, { checkin, checkout, guests });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted-foreground">
          Check-in
          <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className={cn(inputCls, "mt-1")} />
        </label>
        <label className="text-xs text-muted-foreground">
          Check-out
          <input type="date" value={checkout} min={checkin || undefined} onChange={(e) => setCheckout(e.target.value)} className={cn(inputCls, "mt-1")} />
        </label>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
        <span className="text-sm text-foreground">Guests</span>
        <div className="flex items-center gap-3">
          <button aria-label="Fewer guests" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="rounded-full border border-border p-1 hover:bg-muted">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-5 text-center text-sm tabular-nums" aria-live="polite">{guests}</span>
          <button aria-label="More guests" onClick={() => setGuests((g) => Math.min(16, g + 1))} className="rounded-full border border-border p-1 hover:bg-muted">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <a href={url} target="_blank" rel="noopener sponsored" onClick={() => openTracked("booking", label, c)} className={primaryCls}>
        Check prices on Booking.com
      </a>
      <p className="text-center text-[11px] text-muted-foreground">{DISCLOSURE}</p>
    </div>
  );
}

function FlyTab({
  to,
  alt,
  destName,
  destSlug,
  ...c
}: TabCommon & { to?: string; alt: string[]; destName: string; destSlug: string }) {
  const [from, setFrom] = useState(getHomeAirport);
  const [fromText, setFromText] = useState(() => airportLabel(getHomeAirport()));
  const [showSuggest, setShowSuggest] = useState(false);
  const [dest, setDest] = useState(to ?? "");
  const [oneWay, setOneWay] = useState(false);
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");
  useEffect(() => setDest(to ?? ""), [to]);

  const suggestions = useMemo(() => (showSuggest ? searchAirports(fromText) : []), [fromText, showSuggest]);
  const label = buildLabel(c.titleSlug, destSlug, c.surface);
  const { url, isAffiliate } = buildFlightsUrl({ from, to: dest || destName, depart, ret, oneWay }, label);
  const destOptions = [to, ...alt].filter((x): x is string => Boolean(x));

  const pick = (iata: string) => {
    setFrom(iata);
    setFromText(airportLabel(iata));
    setHomeAirport(iata);
    setShowSuggest(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <label htmlFor="trip-from" className="text-xs text-muted-foreground">Flying from</label>
        <input
          id="trip-from"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls="trip-from-list"
          aria-autocomplete="list"
          value={fromText}
          onChange={(e) => {
            setFromText(e.target.value);
            setShowSuggest(true);
            const v = e.target.value.trim().toUpperCase();
            if (/^[A-Z]{3}$/.test(v)) setFrom(v);
          }}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => setTimeout(() => setShowSuggest(false), 120)}
          className={cn(inputCls, "mt-1")}
          placeholder="City or airport code"
        />
        {suggestions.length > 0 && (
          <ul id="trip-from-list" role="listbox" className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {suggestions.map((a) => (
              <li key={a.iata} role="option" aria-selected={a.iata === from}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(a.iata)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span>{a.city}</span>
                  <span className="font-mono text-xs text-muted-foreground">{a.iata}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <span className="text-xs text-muted-foreground">Flying to</span>
        {destOptions.length ? (
          <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Destination airport">
            {destOptions.map((iata) => (
              <button
                key={iata}
                role="radio"
                aria-checked={dest === iata}
                onClick={() => setDest(iata)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  dest === iata ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {airportLabel(iata)}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-foreground">{destName}</p>
        )}
      </div>

      <div className="flex gap-2" role="radiogroup" aria-label="Trip type">
        {[
          { v: false, l: "Return" },
          { v: true, l: "One-way" },
        ].map((o) => (
          <button
            key={o.l}
            role="radio"
            aria-checked={oneWay === o.v}
            onClick={() => setOneWay(o.v)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-xs",
              oneWay === o.v ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {o.l}
          </button>
        ))}
      </div>

      <div className={cn("grid gap-3", oneWay ? "grid-cols-1" : "grid-cols-2")}>
        <label className="text-xs text-muted-foreground">
          Depart
          <input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} className={cn(inputCls, "mt-1")} />
        </label>
        {!oneWay && (
          <label className="text-xs text-muted-foreground">
            Return
            <input type="date" value={ret} min={depart || undefined} onChange={(e) => setRet(e.target.value)} className={cn(inputCls, "mt-1")} />
          </label>
        )}
      </div>

      <a
        href={url}
        target="_blank"
        rel={isAffiliate ? "noopener sponsored" : "noopener noreferrer"}
        onClick={() => openTracked("flights", label, c)}
        className={primaryCls}
      >
        Search flights
      </a>
      {isAffiliate && <p className="text-center text-[11px] text-muted-foreground">{DISCLOSURE}</p>}
    </div>
  );
}

function ToursTab({ dest, ...c }: TabCommon & { dest: TripDestination }) {
  const label = buildLabel(c.titleSlug, dest.slug, c.surface);
  const viator = buildViatorUrl(dest, label);
  const gyg = buildGygUrl(dest, label);

  if (!viator && !gyg) {
    return <p className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">Tours for {dest.name} are coming soon.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {viator && (
        <a href={viator} target="_blank" rel="noopener sponsored" onClick={() => openTracked("viator", label, c)} className={secondaryCls}>
          Tours on Viator
        </a>
      )}
      {gyg && (
        <a href={gyg} target="_blank" rel="noopener sponsored" onClick={() => openTracked("gyg", label, c)} className={secondaryCls}>
          Tours on GetYourGuide
        </a>
      )}
      <p className="text-center text-[11px] text-muted-foreground">{DISCLOSURE}</p>
    </div>
  );
}
