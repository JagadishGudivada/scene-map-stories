import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Footprints, ArrowRight, Plane, BedDouble } from "lucide-react";
import { useRecentVisitedSpots } from "@/hooks/useRecentVisitedSpots";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PEXELS_IMAGE } from "@/lib/pexels";

const FALLBACK_IMG = DEFAULT_PEXELS_IMAGE;

export default function RecentlyVisitedSpots() {
  const navigate = useNavigate();
  const { spots, loading } = useRecentVisitedSpots(6);

  if (!loading && spots.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mb-14"
    >
      <div className="flex items-end justify-between mb-5 gap-4">
        <div className="flex items-center gap-3">
          <Footprints className="w-5 h-5 text-amber" />
          <div>
            <h2 className="font-serif text-2xl text-foreground">Recently Explored by the Community</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Filming spots that fellow explorers just looked up
            </p>
          </div>
        </div>
        <Link
          to="/map"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm text-amber hover:underline shrink-0"
        >
          View map <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] md:auto-rows-[180px] gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => {
              const span = bentoSpan(i);
              return <Skeleton key={i} className={`rounded-2xl ${span}`} />;
            })
          : spots.slice(0, 6).map((spot, i) => {
              const span = bentoSpan(i);
              const isLarge = i === 0;
              return (
                <motion.div
                  key={spot.slug}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className={span}
                >
                  <div
                    onClick={() => navigate(`/spot/${spot.slug}`)}
                    className="group relative h-full w-full rounded-2xl overflow-hidden border border-border hover:border-amber/40 transition-all cursor-pointer"
                  >
                    <img
                      src={spot.image || FALLBACK_IMG}
                      alt={spot.name}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                      }}
                      className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute inset-0 p-3 md:p-4 flex flex-col justify-between text-white">
                      <div className="flex items-center justify-between">
                        <span className="glass rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider border border-white/10 backdrop-blur-md">
                          {spot.flag ? `${spot.flag} ` : ""}{spot.country || "Worldwide"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={`https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights to ${spot.city}${spot.country ? ", " + spot.country : ""}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Find flights to ${spot.city} on Google Flights`}
                            title={`Flights to ${spot.city}`}
                            className="w-7 h-7 rounded-full glass border border-white/10 flex items-center justify-center text-white hover:text-amber transition-all"
                          >
                            <Plane className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${spot.name}, ${spot.city}`)}`}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Find hotels near ${spot.name} on Booking.com`}
                            title={`Hotels near ${spot.name}`}
                            className="w-7 h-7 rounded-full glass border border-white/10 flex items-center justify-center text-white hover:text-amber transition-all"
                          >
                            <BedDouble className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                      <div>
                        <h3 className={`font-serif leading-tight mb-1 line-clamp-2 ${isLarge ? "text-2xl md:text-3xl" : "text-base md:text-lg"}`}>
                          {spot.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-white/70 mb-1">
                          <MapPin className="w-3 h-3" />
                          <span className="line-clamp-1">{spot.city || "Filming spot"}</span>
                        </div>
                        {isLarge && spot.titles.length > 0 && (
                          <p className="hidden sm:block text-[11px] text-white/80 line-clamp-1 italic">
                            Featured in {spot.titles.slice(0, 2).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
      </div>
    </motion.section>
  );
}

function bentoSpan(i: number): string {
  // 4-col bento: [0 spans 2x2 | 1 spans 2x1] / [0 cont. | 2 | 3] / [4 spans 2x1 | 5 spans 2x1]
  switch (i) {
    case 0:
      return "col-span-2 row-span-2";
    case 1:
      return "col-span-2 row-span-1";
    case 2:
      return "col-span-1 row-span-1";
    case 3:
      return "col-span-1 row-span-1";
    case 4:
      return "col-span-2 row-span-1";
    case 5:
      return "col-span-2 row-span-1";
    default:
      return "col-span-1 row-span-1";
  }
}
