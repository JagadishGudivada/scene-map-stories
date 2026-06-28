import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin, Flame, Instagram, Plane, BedDouble } from "lucide-react";
import { DEFAULT_PEXELS_IMAGE, fetchPexelsImage } from "@/lib/pexels";

type TrendySpot = {
  id: string;
  slug: string;
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
  query: string;
};

// Curated trendy on-screen spots from 2025–2026 hit movies & series
const trendySpots: TrendySpot[] = [
  {
    id: "ts1",
    slug: "carette-paris",
    name: "Carette",
    city: "Paris",
    country: "France",
    flag: "🇫🇷",
    title: "Emily in Paris S4",
    titleYear: 2025,
    kind: "Café",
    hashtag: "#EmilyInParisCafe",
    blurb: "Pastel macarons and Trocadéro views — still the most Instagrammed café in Paris.",
    image: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=900&q=80",
    query: "Paris café pastries Trocadero",
  },
  {
    id: "ts2",
    slug: "four-seasons-koh-samui",
    name: "Four Seasons Koh Samui",
    city: "Koh Samui",
    country: "Thailand",
    flag: "🇹🇭",
    title: "The White Lotus S3",
    titleYear: 2025,
    kind: "Hotel",
    hashtag: "#WhiteLotusThailand",
    blurb: "The jungle-meets-ocean resort that made 2025 the year of Thai screen tourism.",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=900&q=80",
    query: "Koh Samui Thailand luxury resort ocean",
  },
  {
    id: "ts3",
    slug: "cantacuzino-castle",
    name: "Cantacuzino Castle",
    city: "Bușteni",
    country: "Romania",
    flag: "🇷🇴",
    title: "Wednesday S2",
    titleYear: 2025,
    kind: "Landmark",
    hashtag: "#WednesdayAddams",
    blurb: "The real-life Nevermore Academy — gothic spires drawing fans from across Europe.",
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=80",
    query: "gothic castle Romania misty",
  },
  {
    id: "ts4",
    slug: "wadi-rum",
    name: "Wadi Rum",
    city: "Aqaba Governorate",
    country: "Jordan",
    flag: "🇯🇴",
    title: "Dune: Prophecy",
    titleYear: 2025,
    kind: "Landmark",
    hashtag: "#DuneProphecy",
    blurb: "Mars-red dunes and sandstone arches — the sci-fi backdrop everyone wants to visit.",
    image: "https://images.unsplash.com/photo-1547234935-497c6f2d94ea?auto=format&fit=crop&w=900&q=80",
    query: "Wadi Rum desert Jordan red dunes",
  },
  {
    id: "ts5",
    slug: "hotel-la-palma",
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
    query: "Capri Italy boutique hotel terrace sea",
  },
  {
    id: "ts6",
    slug: "rah-bath",
    name: "RAH Bath",
    city: "Bath",
    country: "UK",
    flag: "🇬🇧",
    title: "Bridgerton S4",
    titleYear: 2025,
    kind: "Landmark",
    hashtag: "#BridgertonBath",
    blurb: "The Royal Crescent — Penelope and Colin's regency promenade returns in 2025.",
    image: "https://images.unsplash.com/photo-1597211833712-5e41faa202ea?auto=format&fit=crop&w=900&q=80",
    query: "Bath England Royal Crescent regency architecture",
  },
  {
    id: "ts7",
    slug: "hotel-danieli",
    name: "Hotel Danieli",
    city: "Venice",
    country: "Italy",
    flag: "🇮🇹",
    title: "A Complete Unknown",
    titleYear: 2025,
    kind: "Hotel",
    hashtag: "#ACompleteUnknown",
    blurb: "Timothée as Bob Dylan — Greenwich Village and European press tour glamour.",
    image: "https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=900&q=80",
    query: "Venice Italy luxury hotel canal",
  },
  {
    id: "ts8",
    slug: "szabadsag-hid",
    name: "Szabadság híd",
    city: "Budapest",
    country: "Hungary",
    flag: "🇭🇺",
    title: "The Brutalist",
    titleYear: 2024,
    kind: "Landmark",
    hashtag: "#TheBrutalist",
    blurb: "Budapest's brutalist architecture doubled as mid-century America — Oscar bait and aesthetic.",
    image: "https://images.unsplash.com/photo-1489923423629-b50e91f2026e?auto=format&fit=crop&w=900&q=80",
    query: "Budapest bridge architecture Danube",
  },
  {
    id: "ts9",
    slug: "santorini-cliffside",
    name: "Santorini Cliffside",
    city: "Oia",
    country: "Greece",
    flag: "🇬🇷",
    title: "F1",
    titleYear: 2025,
    kind: "Bar",
    hashtag: "#F1Movie",
    blurb: "Brad Pitt's racing drama turned the Aegean into the hottest pit-stop of 2025.",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=900&q=80",
    query: "Santorini Oia cliffside sunset",
  },
  {
    id: "ts10",
    slug: "cafe-sabarsky",
    name: "Cafe Sabarsky",
    city: "New York",
    country: "USA",
    flag: "🇺🇸",
    title: "Severance S2",
    titleYear: 2025,
    kind: "Café",
    hashtag: "#SeveranceS2",
    blurb: "The Lumon-adjacent moody diner aesthetic that took over TikTok coffee culture.",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80",
    query: "New York moody vintage café interior",
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
  const [images, setImages] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        trendySpots.map(async (s) => {
          const img = await fetchPexelsImage(s.query);
          return [s.id, img || s.image || DEFAULT_PEXELS_IMAGE] as const;
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
            <Flame className="w-4 h-4 text-amber" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">
              Trending On-Screen · 2025–2026
            </span>
          </div>
          <h2 className="font-serif text-2xl text-foreground leading-tight">
            Cafés & Spots from this year's hits
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Instagram-famous locations from White Lotus S3, Bridgerton S4, Wednesday S2, Dune: Prophecy & more.
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
            onClick={() => {
              navigate(`/spot/${spot.slug}`, {
                state: {
                  label: spot.name,
                  titleHint: spot.title,
                  type: "Movie", // Default fallback if needed, but FilmingSpotDetail handles it
                  description: spot.blurb
                }
              });
            }}
            className="group flex-shrink-0 w-[280px] sm:w-[300px] snap-start rounded-2xl overflow-hidden glass border border-border hover:border-amber/40 transition-all duration-300 cursor-pointer"
          >
            <div className="relative h-44 overflow-hidden bg-gradient-to-br from-amber/10 via-overlay to-overlay text-overlay-foreground">
              <div className="absolute inset-0 animate-pulse bg-muted/20" aria-hidden />
              <img
                src={images[spot.id] || spot.image}
                alt={`${spot.name}, ${spot.city} — featured in ${spot.title}`}
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== spot.image) {
                    img.src = spot.image;
                  } else if (img.src !== DEFAULT_PEXELS_IMAGE) {
                    img.src = DEFAULT_PEXELS_IMAGE;
                  } else {
                    img.style.display = "none";
                  }
                }}
                className="relative w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-overlay/95 via-overlay/20 to-transparent" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${kindBadge[spot.kind]}`}>
                  {spot.kind}
                </span>
              </div>

              <div className="absolute top-3 right-3 glass rounded-full px-2 py-0.5 flex items-center gap-1 border border-border">
                <Instagram className="w-2.5 h-2.5 text-amber" />
                <span className="text-[10px] font-mono text-current">Viral</span>
              </div>

              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber mb-1">
                  <span>{spot.flag}</span>
                  <MapPin className="w-2.5 h-2.5" />
                  <span className="uppercase tracking-wider truncate">{spot.city}, {spot.country}</span>
                </div>
                <h3 className="font-serif text-lg text-current leading-tight truncate">
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
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-serif text-sm text-foreground leading-snug truncate">
                  {spot.title} <span className="text-muted-foreground">· {spot.titleYear}</span>
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`https://www.skyscanner.net/transport/flights-to/${encodeURIComponent(spot.city)}/?adultsv2=1&cabinclass=economy`}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Find flights to ${spot.city} on Skyscanner`}
                    title={`Flights to ${spot.city}`}
                    className="w-7 h-7 rounded-full glass border border-border flex items-center justify-center text-foreground hover:text-amber hover:border-amber/40 transition-all"
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
                    className="w-7 h-7 rounded-full glass border border-border flex items-center justify-center text-foreground hover:text-amber hover:border-amber/40 transition-all"
                  >
                    <BedDouble className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
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
