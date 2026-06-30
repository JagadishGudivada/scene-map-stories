import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin, Eye } from "lucide-react";
import { DEFAULT_PEXELS_IMAGE, fetchPexelsImage } from "@/lib/pexels";

type RecognisableSpot = {
  id: string;
  place: string;
  city: string;
  country: string;
  flag: string;
  titles: string[];
  slug: string; // links to location page (city-level)
  query: string;
  fallback: string;
};

// "You might recognise this place" — iconic filming spots most people have seen on screen
const recognisableSpots: RecognisableSpot[] = [
  {
    id: "rl1",
    place: "Lacock Abbey",
    city: "Lacock",
    country: "UK",
    flag: "🇬🇧",
    titles: ["Harry Potter", "Pride & Prejudice", "Downton Abbey"],
    slug: "london",
    query: "Lacock Abbey cloisters England",
    fallback: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rl2",
    place: "Dubrovnik Old Town",
    city: "Dubrovnik",
    country: "Croatia",
    flag: "🇭🇷",
    titles: ["Game of Thrones", "Star Wars: The Last Jedi"],
    slug: "dubrovnik",
    query: "Dubrovnik old town walls Adriatic",
    fallback: "https://images.unsplash.com/photo-1555990538-32792141b7bd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rl3",
    place: "Glenfinnan Viaduct",
    city: "Scottish Highlands",
    country: "UK",
    flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    titles: ["Harry Potter", "Outlander"],
    slug: "edinburgh",
    query: "Glenfinnan Viaduct Scotland train",
    fallback: "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rl4",
    place: "Central Park",
    city: "New York City",
    country: "USA",
    flag: "🇺🇸",
    titles: ["Friends", "When Harry Met Sally", "Home Alone 2"],
    slug: "new-york-city",
    query: "Central Park Bow Bridge autumn",
    fallback: "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rl5",
    place: "Shibuya Crossing",
    city: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    titles: ["Lost in Translation", "Fast & Furious: Tokyo Drift"],
    slug: "tokyo",
    query: "Shibuya crossing Tokyo night neon",
    fallback: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rl6",
    place: "Pont Neuf & Seine",
    city: "Paris",
    country: "France",
    flag: "🇫🇷",
    titles: ["Amélie", "Emily in Paris", "Midnight in Paris"],
    slug: "paris",
    query: "Pont Neuf Paris Seine bridge",
    fallback: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rl7",
    place: "Trevi Fountain",
    city: "Rome",
    country: "Italy",
    flag: "🇮🇹",
    titles: ["La Dolce Vita", "The Lizzie McGuire Movie"],
    slug: "rome",
    query: "Trevi Fountain Rome baroque",
    fallback: "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rl8",
    place: "Fushimi Inari Shrine",
    city: "Kyoto",
    country: "Japan",
    flag: "🇯🇵",
    titles: ["Memoirs of a Geisha"],
    slug: "kyoto",
    query: "Fushimi Inari torii gates Kyoto",
    fallback: "https://images.unsplash.com/photo-1478436127897-769e1538f1a2?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rl9",
    place: "Oia Cliffs",
    city: "Santorini",
    country: "Greece",
    flag: "🇬🇷",
    titles: ["Sisterhood of the Traveling Pants", "Mamma Mia! 2"],
    slug: "santorini",
    query: "Santorini Oia white houses blue domes",
    fallback: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=900&q=80",
  },
];

export default function PopularLocations() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        recognisableSpots.map(async (s) => {
          const img = await fetchPexelsImage(s.query);
          return [s.id, img || s.fallback || DEFAULT_PEXELS_IMAGE] as const;
        })
      );
      if (!cancelled) setImages(Object.fromEntries(results));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-amber" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">
              You might recognise this place
            </span>
          </div>
          <h2 className="font-serif text-2xl text-foreground leading-tight">
            Iconic filming locations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real places you've seen on screen a hundred times — and can actually visit.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory"
      >
        {recognisableSpots.map((spot, i) => (
          <motion.div
            key={spot.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="flex-shrink-0 w-[260px] sm:w-[280px] snap-start"
          >
            <Link
              to={`/location/${spot.slug}`}
              className="group block relative rounded-2xl overflow-hidden border border-border hover:border-amber/40 transition-all duration-300 aspect-[4/5]"
            >
              <div className="absolute inset-0 animate-pulse bg-muted/20" aria-hidden />
              <img
                src={images[spot.id] || spot.fallback}
                alt={`${spot.place}, ${spot.city} — recognisable from ${spot.titles.join(", ")}`}
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== spot.fallback) {
                    img.src = spot.fallback;
                  } else if (img.src !== DEFAULT_PEXELS_IMAGE) {
                    img.src = DEFAULT_PEXELS_IMAGE;
                  }
                }}
                className="relative w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Bottom gradient for legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

              {/* Location chip top-left */}
              <div className="absolute top-3 left-3 glass rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-border">
                <span className="text-xs leading-none">{spot.flag}</span>
                <MapPin className="w-3 h-3 text-amber" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-foreground truncate max-w-[120px]">
                  {spot.city}
                </span>
              </div>

              {/* Place + film badge bottom */}
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="font-serif text-xl text-white leading-tight mb-2 drop-shadow-md">
                  {spot.place}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {spot.titles.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-amber bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber/30"
                    >
                      📍 {t}
                    </span>
                  ))}
                  {spot.titles.length > 2 && (
                    <span className="text-[10px] font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded-full">
                      +{spot.titles.length - 2}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
