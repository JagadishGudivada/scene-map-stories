import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import type { Title } from "@/lib/mockData";

const typeBadgeClass: Record<string, string> = {
  Movie: "badge-movie",
  Series: "badge-series",
  Book: "badge-book",
};

interface TrendingRowProps {
  titles: Title[];
}

export default function TrendingRow({ titles }: TrendingRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-2xl text-foreground">Trending Now</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
      >
        {titles.map((title, i) => (
          <motion.div
            key={title.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex-shrink-0 w-48 group cursor-pointer"
          >
            {/* Poster */}
            <div className="relative h-64 rounded-xl overflow-hidden mb-3 shadow-card">
              <img
                src={title.coverImage}
                alt={title.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 cinema-overlay" />
              {/* Type badge */}
              <div className="absolute top-2 left-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadgeClass[title.type]}`}>
                  {title.type}
                </span>
              </div>
              {/* Location count */}
              <div className="absolute bottom-2 left-2 right-2">
                <div className="glass rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-amber shrink-0" />
                  <span className="text-xs text-foreground font-medium truncate">{title.locationCount} locations</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div>
              <h3 className="font-serif text-sm text-foreground leading-snug mb-1 truncate">{title.title}</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber fill-amber" />
                  <span className="text-xs text-amber font-semibold">{title.rating}</span>
                </div>
                <span className="text-xs text-muted-foreground">{title.year}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
