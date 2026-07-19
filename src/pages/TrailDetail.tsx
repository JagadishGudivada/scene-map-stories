import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Film, MapPin, Route } from "lucide-react";
import Seo from "@/components/Seo";
import FilmingTrailDialog from "@/components/FilmingTrailDialog";
import TrailMap from "@/components/map/TrailMap";
import { useTrailById } from "@/hooks/useTrails";
import type { TrailStop } from "@/hooks/useTrails";

const MAX_TITLE_CHIPS = 3;

/** "Elstree Studios, Borehamwood, UK" → title "Elstree Studios", locality "Borehamwood, UK". */
function displayParts(s: TrailStop): { name: string; locality: string } {
  const segments = s.name.split(",").map((p) => p.trim()).filter(Boolean);
  const name = segments[0] ?? s.name;
  const locality =
    [s.city, s.country].filter(Boolean).join(", ") || segments.slice(1).join(", ") || "—";
  return { name, locality };
}

export default function TrailDetail() {
  const { id } = useParams<{ id: string }>();
  const { trail, loading } = useTrailById(id);
  const [trailOpen, setTrailOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const stopRefs = useRef<(HTMLLIElement | null)[]>([]);

  const stops = trail?.stops ?? [];

  // Scroll-sync: the stop card crossing the upper-middle of the viewport drives the map.
  useEffect(() => {
    const els = stopRefs.current.filter((el): el is HTMLLIElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.stopIndex);
          if (Number.isFinite(idx)) setActiveIndex(idx);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [trail]);

  const scrollToStop = useCallback((i: number) => {
    setActiveIndex(i);
    stopRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const activeStop = activeIndex != null ? stops[activeIndex] : null;

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <Seo
        title={trail ? `${trail.name} · Sarevista` : "Trail · Sarevista"}
        description={
          trail
            ? `A ${trail.kind === "walking" ? "walking trail" : "one-day drive"} through ${trail.stops.length} real screen locations.`
            : "Curated screen-location trail on Sarevista."
        }
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading trail…</p>
        ) : !trail ? (
          <p className="text-sm text-muted-foreground">Trail not found.</p>
        ) : (
          <>
            <span className="text-[10px] font-mono tracking-[0.24em] uppercase text-gold-soft">
              {trail.kind === "walking" ? "Walking trail" : "One-day drive"}
            </span>
            <h1 className="font-serif italic text-3xl sm:text-4xl mt-2 mb-4">
              {trail.name}
            </h1>
            <p className="text-sm text-foreground/80 mb-4 max-w-2xl">
              Complete this trail and you'll have visited {trail.stops.length} screen{" "}
              {trail.stops.length === 1 ? "location" : "locations"}
              {trail.titleCount > 0 && (
                <>
                  {" "}from {trail.titleCount}{" "}
                  {trail.titleCount === 1 ? "film/series" : "films & series"}
                </>
              )}
              .
            </p>

            {trail.stops.length >= 2 && (
              <button
                onClick={() => setTrailOpen(true)}
                className="mb-8 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-gradient-amber text-charcoal font-bold text-xs shadow-amber hover:opacity-90 transition-opacity"
              >
                <Route className="w-3.5 h-3.5" />
                Build Trail
              </button>
            )}

            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10 lg:items-start">
              {/* Map first in DOM so it leads on mobile; pinned right column on desktop. */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mb-8 lg:mb-0 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24"
              >
                <div className="relative rounded-2xl overflow-hidden border border-border shadow-card">
                  <TrailMap
                    stops={stops}
                    activeIndex={activeIndex}
                    onStopClick={scrollToStop}
                    className="h-72 lg:h-[calc(100vh-9rem)]"
                  />
                  <div className="absolute top-3 left-3 z-10 glass rounded-full pl-2.5 pr-3 py-1.5 border border-border/60 flex items-center gap-1.5 pointer-events-none">
                    <Route className="w-3 h-3 text-amber" />
                    <span className="text-[11px] font-medium text-foreground">
                      {stops.length} stops · {Math.round(trail.totalKm)} km
                    </span>
                  </div>
                  {activeStop && (
                    <motion.div
                      key={activeIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="absolute bottom-3 left-3 right-3 z-10 glass rounded-xl border border-border/60 px-3.5 py-2.5 flex items-center gap-3 pointer-events-none"
                    >
                      {activeStop.image && (
                        <img
                          src={activeStop.image}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-gold-soft">
                          Stop {String((activeIndex ?? 0) + 1).padStart(2, "0")}
                        </p>
                        <p className="font-serif italic text-sm text-foreground truncate">
                          {displayParts(activeStop).name}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              <ol className="space-y-3 lg:col-start-1 lg:row-start-1">
                {trail.stops.map((s, i) => {
                  const { name, locality } = displayParts(s);
                  const isActive = i === activeIndex;
                  return (
                    <motion.li
                      key={s.slug ?? `${s.name}-${i}`}
                      ref={(el) => (stopRefs.current[i] = el)}
                      data-stop-index={i}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className={`flex gap-3 sm:gap-4 rounded-2xl border p-3 sm:p-4 transition-colors duration-300 ${
                        isActive
                          ? "border-gold-deep/50 bg-gold-deep/[0.06]"
                          : "border-border/60 bg-card/60"
                      }`}
                    >
                      <div
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs transition-colors duration-300 ${
                          isActive
                            ? "bg-gradient-amber text-charcoal font-bold"
                            : "bg-foreground/5 text-gold-soft"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      {s.image && (
                        <img
                          src={s.image}
                          alt={name}
                          loading="lazy"
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {s.slug ? (
                          <Link
                            to={`/spot/${s.slug}`}
                            className="font-serif italic text-lg hover:text-gold-deep transition-colors"
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className="font-serif italic text-lg">{name}</span>
                        )}
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {locality}
                        </div>
                        {s.titles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {s.titles.slice(0, MAX_TITLE_CHIPS).map((t) => (
                              <Link
                                key={t.slug}
                                to={`/title/${t.slug}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-gold-soft hover:border-gold-soft/50 transition-colors"
                              >
                                <Film className="w-2.5 h-2.5" />
                                {t.name}
                              </Link>
                            ))}
                            {s.titles.length > MAX_TITLE_CHIPS && (
                              <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                                +{s.titles.length - MAX_TITLE_CHIPS}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </div>

            <FilmingTrailDialog
              open={trailOpen}
              onOpenChange={setTrailOpen}
              titleSlug={trail.id}
              titleName={trail.name}
              locations={trail.stops.map((s) => ({
                label: s.name,
                lat: s.lat,
                lng: s.lng,
                city: s.city ?? undefined,
                country: s.country ?? undefined,
              }))}
            />
          </>
        )}
      </div>
    </div>
  );
}
