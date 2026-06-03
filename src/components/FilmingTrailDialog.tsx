import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Route,
  MapPin,
  ArrowDown,
  Shuffle,
  RotateCcw,
  ExternalLink,
  Download,
  Save,
  Trash2,
  Sparkles,
  Navigation,
  Clock,
  GripVertical,
  Loader2,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export interface TrailStop {
  label: string;
  lat: number;
  lng: number;
  description?: string;
  city?: string;
  country?: string;
}

interface FilmingTrailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleSlug: string;
  titleName: string;
  locations: TrailStop[];
}

const EARTH_KM = 6371;
function haversineKm(a: TrailStop, b: TrailStop): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Nearest-neighbor route optimization starting from `start`. */
function optimizeRoute(stops: TrailStop[], startIndex = 0): TrailStop[] {
  if (stops.length <= 2) return [...stops];
  const remaining = [...stops];
  const ordered: TrailStop[] = [];
  let current = remaining.splice(startIndex, 1)[0];
  ordered.push(current);
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    current = remaining.splice(bestIdx, 1)[0];
    ordered.push(current);
  }
  return ordered;
}

function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function estimateDays(totalKm: number, stops: number): number {
  // Heuristic: ~3 stops/day if compact (<300km total), else split by ~400km/day travel
  const byStops = Math.max(1, Math.ceil(stops / 3));
  const byDist = Math.max(1, Math.ceil(totalKm / 400));
  return Math.max(byStops, byDist);
}

const STORAGE_KEY = (slug: string) => `filming-trail:${slug}`;

export default function FilmingTrailDialog({
  open,
  onOpenChange,
  titleSlug,
  titleName,
  locations,
}: FilmingTrailDialogProps) {
  const validStops = useMemo(
    () =>
      locations.filter(
        (l) =>
          Number.isFinite(l.lat) &&
          Number.isFinite(l.lng) &&
          (l.lat !== 0 || l.lng !== 0)
      ),
    [locations]
  );

  const [order, setOrder] = useState<TrailStop[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Initialize from localStorage or optimize
  useEffect(() => {
    if (!open) return;
    if (!validStops.length) {
      setOrder([]);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY(titleSlug));
      if (raw) {
        const parsed = JSON.parse(raw) as { order: TrailStop[]; savedAt: string };
        // Validate parsed stops still exist in current locations
        const stillValid = parsed.order.filter((s) =>
          validStops.some((v) => v.lat === s.lat && v.lng === s.lng)
        );
        if (stillValid.length >= Math.min(2, validStops.length)) {
          setOrder(stillValid);
          setSavedAt(parsed.savedAt);
          return;
        }
      }
    } catch {
      // ignore
    }
    setOrder(optimizeRoute(validStops));
    setSavedAt(null);
  }, [open, titleSlug, validStops]);

  const legs = useMemo(() => {
    const result: number[] = [];
    for (let i = 1; i < order.length; i++) {
      result.push(haversineKm(order[i - 1], order[i]));
    }
    return result;
  }, [order]);

  const totalKm = useMemo(() => legs.reduce((s, l) => s + l, 0), [legs]);
  const days = useMemo(() => estimateDays(totalKm, order.length), [totalKm, order.length]);

  const grouped = useMemo(() => {
    const groups: { city: string; stops: { stop: TrailStop; idx: number }[] }[] = [];
    order.forEach((stop, idx) => {
      const city = stop.city || stop.label.split(",").slice(-2, -1)[0]?.trim() || "Other";
      const last = groups[groups.length - 1];
      if (last && last.city === city) {
        last.stops.push({ stop, idx });
      } else {
        groups.push({ city, stops: [{ stop, idx }] });
      }
    });
    return groups;
  }, [order]);

  const handleOptimize = useCallback(() => {
    setBusy(true);
    setTimeout(() => {
      setOrder(optimizeRoute(validStops));
      setBusy(false);
      toast({ title: "Trail optimized", description: "Shortest route by nearest-neighbor." });
    }, 250);
  }, [validStops]);

  const handleReverse = useCallback(() => {
    setOrder((o) => [...o].reverse());
  }, []);

  const handleShuffle = useCallback(() => {
    setOrder((o) => {
      const copy = [...o];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  }, []);

  const handleSave = useCallback(() => {
    try {
      const ts = new Date().toISOString();
      localStorage.setItem(
        STORAGE_KEY(titleSlug),
        JSON.stringify({ order, savedAt: ts })
      );
      setSavedAt(ts);
      toast({ title: "Trail saved", description: `${order.length} stops · ${formatKm(totalKm)}` });
    } catch {
      toast({ title: "Couldn't save", description: "Storage unavailable." });
    }
  }, [order, titleSlug, totalKm]);

  const handleClear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY(titleSlug));
    setSavedAt(null);
    setOrder(optimizeRoute(validStops));
    toast({ title: "Trail reset" });
  }, [titleSlug, validStops]);

  const googleMapsUrl = useMemo(() => {
    if (order.length < 2) return null;
    // Google Maps multi-stop: origin / destination / waypoints
    const origin = `${order[0].lat},${order[0].lng}`;
    const destination = `${order[order.length - 1].lat},${order[order.length - 1].lng}`;
    const waypoints = order
      .slice(1, -1)
      .map((s) => `${s.lat},${s.lng}`)
      .join("|");
    const base = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}` : base;
  }, [order]);

  const handleExportGpx = useCallback(() => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Filming Trail" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${titleName} — Filming Trail</name></metadata>
  <rte>
    <name>${titleName}</name>
${order
  .map(
    (s, i) =>
      `    <rtept lat="${s.lat}" lon="${s.lng}"><name>${i + 1}. ${s.label.replace(/[<&>]/g, "")}</name></rtept>`
  )
  .join("\n")}
  </rte>
</gpx>`;
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titleSlug}-trail.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [order, titleName, titleSlug]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber mb-1.5">
            <Route className="w-3.5 h-3.5" />
            <span>Filming Trail</span>
            {savedAt && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground normal-case tracking-normal">
                <Check className="w-3 h-3 text-teal" />
                Saved
              </span>
            )}
          </div>
          <DialogTitle className="font-serif text-2xl sm:text-3xl text-foreground text-left leading-tight">
            {titleName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            An optimized multi-stop itinerary you can actually travel.
          </p>
        </DialogHeader>

        {/* Stats row */}
        {order.length >= 2 ? (
          <div className="grid grid-cols-3 border-b border-border bg-muted/20">
            <div className="px-4 py-3 text-center border-r border-border">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stops</p>
              <p className="font-serif text-xl text-foreground mt-0.5">{order.length}</p>
            </div>
            <div className="px-4 py-3 text-center border-r border-border">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Distance</p>
              <p className="font-serif text-xl text-amber mt-0.5">{formatKm(totalKm)}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Suggested</p>
              <p className="font-serif text-xl text-teal mt-0.5">
                {days} day{days > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ) : null}

        {/* Action toolbar */}
        {order.length >= 2 && (
          <div className="px-4 sm:px-5 py-2.5 border-b border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={handleOptimize}
              disabled={busy}
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-amber/10 hover:bg-amber/20 border border-amber/30 text-amber text-xs font-medium transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Optimize
            </button>
            <button
              onClick={handleReverse}
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full glass border border-border text-foreground hover:bg-muted/50 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reverse
            </button>
            <button
              onClick={handleShuffle}
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full glass border border-border text-foreground hover:bg-muted/50 text-xs font-medium transition-colors"
            >
              <Shuffle className="w-3 h-3" /> Shuffle
            </button>
            <div className="w-px h-5 bg-border shrink-0" />
            <button
              onClick={handleSave}
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full glass border border-border text-foreground hover:bg-muted/50 text-xs font-medium transition-colors"
            >
              <Save className="w-3 h-3" /> Save
            </button>
            {savedAt && (
              <button
                onClick={handleClear}
                className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full glass border border-border text-muted-foreground hover:text-destructive hover:bg-muted/50 text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Trail list */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 no-scrollbar">
          {order.length < 2 ? (
            <div className="py-16 text-center">
              <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-serif text-lg text-foreground mb-1">
                Not enough mapped locations
              </p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                A trail needs at least two pinned spots with coordinates. Add or verify locations first.
              </p>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={order}
              onReorder={setOrder}
              className="space-y-2"
            >
              {grouped.map((group, gIdx) => (
                <div key={`${group.city}-${gIdx}`} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                      {group.city}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] text-muted-foreground">
                      {group.stops.length} stop{group.stops.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <AnimatePresence initial={false}>
                    {group.stops.map(({ stop, idx }) => {
                      const legBefore = idx > 0 ? legs[idx - 1] : null;
                      return (
                        <div key={`${stop.lat}-${stop.lng}-${idx}`}>
                          {legBefore !== null && (
                            <div className="flex items-center gap-2 pl-4 py-1">
                              <div className="w-px h-4 bg-border" />
                              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                                <ArrowDown className="w-2.5 h-2.5" />
                                {formatKm(legBefore)}
                              </span>
                            </div>
                          )}
                          <Reorder.Item
                            value={stop}
                            as="div"
                            className="group relative flex items-center gap-3 p-3 rounded-xl glass border border-border hover:border-amber/30 transition-colors cursor-grab active:cursor-grabbing"
                          >
                            <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-amber text-charcoal font-serif font-bold text-sm flex items-center justify-center shadow-amber">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {stop.label}
                              </p>
                              {stop.description && (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {stop.description}
                                </p>
                              )}
                            </div>
                            <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                          </Reorder.Item>
                        </div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </Reorder.Group>
          )}
        </div>

        {/* Footer actions */}
        {order.length >= 2 && (
          <div className="px-4 sm:px-5 py-3 border-t border-border flex items-center gap-2 bg-background/80 backdrop-blur">
            <button
              onClick={handleExportGpx}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full glass border border-border text-foreground hover:bg-muted/50 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> GPX
            </button>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 h-10 px-4 sm:px-5 rounded-full bg-gradient-amber text-charcoal font-bold text-xs shadow-amber hover:opacity-90 transition-opacity"
              >
                <Navigation className="w-3.5 h-3.5" />
                Open route in Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
