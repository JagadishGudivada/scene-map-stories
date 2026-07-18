import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Footprints, Car, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { useTrails } from "@/hooks/useTrails";

export default function TrailsAndTours() {
  const { trails, loading } = useTrails(4);

  return (
    <section className="mb-10 sm:mb-16" aria-labelledby="trails-heading">
      <div className="flex items-baseline justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-baseline gap-3">
          <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.24em] uppercase text-gold-soft">
            Trails & Tours
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground">
            Ready-made routes
          </span>
        </div>
      </div>
      <h2 id="trails-heading" className="sr-only">Curated screen-location trails</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Building trails from real locations…
        </div>
      ) : trails.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6">
          Not enough locations yet to build a trail. Add a few more spots to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {trails.map((t, i) => {
            const stopsCount = t.stops.length;
            const cappedFilms = t.titleCount;
            const outcome =
              cappedFilms > 0
                ? `Complete this trail and you'll have visited ${stopsCount} screen ${
                    stopsCount === 1 ? "location" : "locations"
                  } from ${cappedFilms} ${cappedFilms === 1 ? "film/series" : "films & series"}.`
                : `Complete this trail and you'll have visited ${stopsCount} real screen ${
                    stopsCount === 1 ? "location" : "locations"
                  }.`;
            const Icon = t.kind === "walking" ? Footprints : Car;
            const kindLabel = t.kind === "walking" ? "Walking trail" : "One-day drive";

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <Link
                  to={`/trails/${t.id}`}
                  className="group relative block rounded-2xl border border-border/60 bg-card/60 overflow-hidden hover:border-gold-soft/60 transition-colors"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {t.heroImage ? (
                      <img
                        src={t.heroImage}
                        alt={t.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-foreground/5 to-foreground/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-md ring-1 ring-white/10">
                      <Icon className="w-3 h-3 text-gold-soft" strokeWidth={2} />
                      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/90">
                        {kindLabel}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-serif italic text-white text-lg sm:text-xl leading-tight line-clamp-2">
                        {t.name}
                      </h3>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" strokeWidth={2} />
                        {stopsCount} {stopsCount === 1 ? "stop" : "stops"}
                      </span>
                      {t.totalKm > 0 && (
                        <span className="font-mono">
                          {t.totalKm < 10 ? t.totalKm.toFixed(1) : Math.round(t.totalKm)} km
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed line-clamp-3">
                      {outcome}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.16em] text-gold-soft group-hover:text-gold-deep transition-colors">
                      View trail
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
