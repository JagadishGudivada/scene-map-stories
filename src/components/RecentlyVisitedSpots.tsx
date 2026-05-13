import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Footprints, ArrowRight } from "lucide-react";
import { useRecentVisitedSpots } from "@/hooks/useRecentVisitedSpots";
import { Skeleton } from "@/components/ui/skeleton";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=70";

export default function RecentlyVisitedSpots() {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))
          : spots.map((spot, i) => (
              <motion.div
                key={spot.slug}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Link
                  to={`/spot/${spot.slug}`}
                  className="group block relative h-56 rounded-2xl overflow-hidden border border-border hover:border-amber/40 transition-all"
                >
                  <img
                    src={spot.image || FALLBACK_IMG}
                    alt={spot.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                    }}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                    <div className="flex items-center justify-between">
                      <span className="glass rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider border border-white/10 backdrop-blur-md">
                        {spot.flag ? `${spot.flag} ` : ""}{spot.country || "Worldwide"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-serif text-xl leading-tight mb-1 line-clamp-1">
                        {spot.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-white/70 mb-2">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{spot.city || "Filming spot"}</span>
                      </div>
                      {spot.titles.length > 0 && (
                        <p className="text-[11px] text-white/80 line-clamp-1 italic">
                          Featured in {spot.titles.slice(0, 2).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
      </div>
    </motion.section>
  );
}
