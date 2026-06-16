import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Flame, Instagram } from "lucide-react";

type TrendySpot = {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  title: string;
  titleYear: number;
  kind: "Café" | "Restaurant" | "Bar" | "Hotel" | "Landmark";
  hashtag: string;
  blurb: string;
  image: string;
};

// Curated trendy on-screen spots from recent (2024–2025) hit movies & series
const trendySpots: TrendySpot[] = [
  {
    id: "ts1",
    name: "Carette",
    city: "Paris",
    country: "France",
    flag: "🇫🇷",
    title: "Emily in Paris",
    titleYear: 2024,
    kind: "Café",
    hashtag: "#EmilyInParisCafe",
    blurb: "Pastel macarons and Trocadéro views — Emily's go-to breakfast stop.",
    image: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ts2",
    name: "Drayton Manor",
    city: "Northamptonshire",
    country: "UK",
    flag: "🇬🇧",
    title: "Saltburn",
    titleYear: 2023,
    kind: "Landmark",
    hashtag: "#SaltburnHouse",
    blurb: "The opulent estate that broke TikTok — bathtub scene and all.",
    image: "https://images.unsplash.com/photo-1533619239233-6280475a633a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ts3",
    name: "Hotel La Palma",
    city: "Capri",
    country: "Italy",
    flag: "🇮🇹",
    title: "Challengers",
    titleYear: 2024,
    kind: "Hotel",
    hashtag: "#ChallengersAesthetic",
    blurb: "Mediterranean cool where Zendaya's tennis trio simmered on screen.",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ts4",
    name: "Four Seasons Taormina",
    city: "Sicily",
    country: "Italy",
    flag: "🇮🇹",
    title: "The White Lotus S2",
    titleYear: 2024,
    kind: "Hotel",
    hashtag: "#WhiteLotusSicily",
    blurb: "San Domenico Palace — the pastel cliffside hotel the internet obsessed over.",
    image: "https://images.unsplash.com/photo-1612698093158-e07ac200d44e?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ts5",
    name: "Ranthambore Fort",
    city: "Rajasthan",
    country: "India",
    flag: "🇮🇳",
    title: "The White Lotus S3",
    titleYear: 2025,
    kind: "Landmark",
    hashtag: "#WhiteLotusThailand",
    blurb: "Four Seasons Koh Samui meets jungle drama — the new season's IG-bait backdrop.",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ts6",
    name: "RAH Bath",
    city: "Bath",
    country: "UK",
    flag: "🇬🇧",
    title: "Bridgerton S3",
    titleYear: 2024,
    kind: "Landmark",
    hashtag: "#BridgertonBath",
    blurb: "The Royal Crescent — Penelope and Colin's regency promenade.",
    image: "https://images.unsplash.com/photo-1597211833712-5e41faa202ea?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ts7",
    name: "Stoke Park",
    city: "Buckinghamshire",
    country: "UK",
    flag: "🇬🇧",
    title: "Wonka",
    titleYear: 2023,
    kind: "Landmark",
    hashtag: "#WonkaWorld",
    blurb: "Timothée's chocolate-shop wonderland — Lyme & Bath stand-ins galore.",
    image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ts8",
    name: "Café de Flore",
    city: "Paris",
    country: "France",
    flag: "🇫🇷",
    title: "Lupin",
    titleYear: 2024,
    kind: "Café",
    hashtag: "#LupinParis",
    blurb: "Saint-Germain's literary café — Assane's slow espresso between heists.",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ts9",
    name: "Schloss Leopoldskron",
    city: "Salzburg",
    country: "Austria",
    flag: "🇦🇹",
    title: "Ripley",
    titleYear: 2024,
    kind: "Hotel",
    hashtag: "#RipleyNetflix",
    blurb: "Black-and-white Atrani staircases turned the Amalfi Coast viral again.",
    image: "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ts10",
    name: "Sant Sebastià Beach",
    city: "Barcelona",
    country: "Spain",
    flag: "🇪🇸",
    title: "Wednesday S2",
    titleYear: 2025,
    kind: "Landmark",
    hashtag: "#WednesdayAddams",
    blurb: "Cantacuzino Castle, Romania — the gothic Nevermore Academy fans flock to.",
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=80",
  },
];

const kindBadge: Record<TrendySpot["kind"], string> = {
  Café: "bg-amber/15 text-amber border-amber/30",
  Restaurant: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Bar: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Hotel: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  Landmark: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export default function TrendyScreenSpots() {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-amber" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">
              Trending On-Screen · 2024–2025
            </span>
          </div>
          <h2 className="font-serif text-2xl text-foreground leading-tight">
            Cafés & Spots from this year's hits
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Instagram-famous locations from Emily in Paris, White Lotus, Saltburn, Challengers & more.
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
        {trendySpots.map((spot, i) => (
          <motion.article
            key={spot.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="group flex-shrink-0 w-[280px] sm:w-[300px] snap-start rounded-2xl overflow-hidden glass border border-border hover:border-amber/40 transition-all duration-300 cursor-pointer"
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src={spot.image}
                alt={`${spot.name}, ${spot.city} — featured in ${spot.title}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/95 via-charcoal/20 to-transparent" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${kindBadge[spot.kind]}`}>
                  {spot.kind}
                </span>
              </div>

              <div className="absolute top-3 right-3 glass rounded-full px-2 py-0.5 flex items-center gap-1 border border-border">
                <Instagram className="w-2.5 h-2.5 text-amber" />
                <span className="text-[10px] font-mono text-foreground">Viral</span>
              </div>

              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber mb-1">
                  <span>{spot.flag}</span>
                  <MapPin className="w-2.5 h-2.5" />
                  <span className="uppercase tracking-wider truncate">{spot.city}, {spot.country}</span>
                </div>
                <h3 className="font-serif text-lg text-foreground leading-tight truncate">
                  {spot.name}
                </h3>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  As seen in
                </span>
              </div>
              <p className="font-serif text-sm text-foreground leading-snug mb-2">
                {spot.title} <span className="text-muted-foreground">· {spot.titleYear}</span>
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                {spot.blurb}
              </p>
              <span className="inline-block text-[11px] font-mono text-amber bg-amber/10 px-2 py-0.5 rounded-full border border-amber/20">
                {spot.hashtag}
              </span>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
