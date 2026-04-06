import { useState, useRef, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  MapPin, Star, Bookmark, Camera, ChevronDown, Grid3X3, List,
  Train, ArrowRight, Bell, Sparkles, ChevronRight, Search, X
} from "lucide-react";
import LeafletMap from "@/components/LeafletMap";
import ShareMenu from "@/components/ShareMenu";
import type { MapPin as MapPinType } from "@/components/LeafletMap";
import heroRomeImg from "@/assets/hero-rome-location.jpg";
import heroRomeAlt from "@/assets/hero-rome.jpg";
import tokyoImg from "@/assets/location-tokyo.jpg";
import londonImg from "@/assets/location-london.jpg";
import nycImg from "@/assets/location-nyc.jpg";
import santoriniImg from "@/assets/location-santorini.jpg";
import kyotoImg from "@/assets/location-kyoto.jpg";

// --- Mock data for Rome ---
const romeData = {
  name: "Rome",
  country: "Italy",
  countryCode: "IT",
  flag: "🇮🇹",
  totalTitles: 22,
  totalLocations: 89,
  explorers: "12.4k",
  coords: { lat: 41.9028, lng: 12.4964 },
  tagline: "The Eternal City — cinema's most enduring backdrop",
};

interface LocationTitle {
  id: string;
  title: string;
  year: number;
  type: "Movie" | "Series" | "Book";
  spots: number;
  genres: string[];
  rating: number;
  image: string;
}

const romeTitles: LocationTitle[] = [
  { id: "1", title: "Gladiator", year: 2000, type: "Movie", spots: 19, genres: ["Action", "Drama"], rating: 8.5, image: heroRomeAlt },
  { id: "2", title: "Roman Holiday", year: 1953, type: "Movie", spots: 11, genres: ["Romance"], rating: 8.0, image: santoriniImg },
  { id: "3", title: "Angels & Demons", year: 2009, type: "Movie", spots: 8, genres: ["Thriller"], rating: 6.7, image: londonImg },
  { id: "4", title: "The Great Beauty", year: 2013, type: "Movie", spots: 14, genres: ["Drama"], rating: 7.8, image: kyotoImg },
  { id: "5", title: "To Rome with Love", year: 2012, type: "Movie", spots: 7, genres: ["Comedy", "Romance"], rating: 6.3, image: nycImg },
  { id: "6", title: "House of Gucci", year: 2021, type: "Movie", spots: 5, genres: ["Drama", "Crime"], rating: 6.6, image: tokyoImg },
];

interface FilmingSpot {
  id: number;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  titles: string[];
}

const filmingSpots: FilmingSpot[] = [
  { id: 1, slug: "the-colosseum", name: "The Colosseum", lat: 41.8902, lng: 12.4922, titles: ["Gladiator", "Roman Holiday"] },
  { id: 2, slug: "trevi-fountain", name: "Trevi Fountain", lat: 41.9009, lng: 12.4833, titles: ["Roman Holiday", "To Rome with Love"] },
  { id: 3, slug: "pantheon", name: "Pantheon", lat: 41.8986, lng: 12.4769, titles: ["Angels & Demons"] },
  { id: 4, slug: "villa-borghese", name: "Villa Borghese", lat: 41.9142, lng: 12.4921, titles: ["The Great Beauty"] },
  { id: 5, slug: "spanish-steps", name: "Spanish Steps", lat: 41.9060, lng: 12.4828, titles: ["Roman Holiday"] },
  { id: 6, slug: "vatican-city", name: "Vatican City", lat: 41.9029, lng: 12.4534, titles: ["Angels & Demons"] },
  { id: 7, slug: "piazza-navona", name: "Piazza Navona", lat: 41.8992, lng: 12.4731, titles: ["Roman Holiday", "To Rome with Love"] },
];

const communityPhotos = [
  { id: "c1", user: "elena_roma", match: 96, likes: 342 },
  { id: "c2", user: "travelwithmark", match: 91, likes: 218 },
  { id: "c3", user: "sophiekim", match: 88, likes: 567 },
  { id: "c4", user: "upload", match: 0, likes: 0 },
  { id: "c5", user: "marco_v", match: 94, likes: 189 },
  { id: "c6", user: "cinephile_anna", match: 85, likes: 421 },
  { id: "c7", user: "jameslee", match: 92, likes: 156 },
  { id: "c8", user: "luciafilm", match: 90, likes: 298 },
];

const relatedLocations = [
  { name: "Paris", code: "FR", flag: "🇫🇷", count: 35, slug: "paris" },
  { name: "London", code: "GB", flag: "🇬🇧", count: 38, slug: "london" },
  { name: "Santorini", code: "GR", flag: "🇬🇷", count: 12, slug: "santorini" },
  { name: "Barcelona", code: "ES", flag: "🇪🇸", count: 19, slug: "barcelona" },
  { name: "Lisbon", code: "PT", flag: "🇵🇹", count: 9, slug: "lisbon" },
];

const monthData = [
  { month: "Jan", level: 1 }, { month: "Feb", level: 1 }, { month: "Mar", level: 2 },
  { month: "Apr", level: 2 }, { month: "May", level: 3 }, { month: "Jun", level: 4 },
  { month: "Jul", level: 5 }, { month: "Aug", level: 5 }, { month: "Sep", level: 3 },
  { month: "Oct", level: 2 }, { month: "Nov", level: 2 }, { month: "Dec", level: 1 },
];

const crowdSpots = [
  { name: "Colosseum", status: "Very Busy", color: "text-destructive" },
  { name: "Trevi Fountain", status: "Busy", color: "text-amber" },
  { name: "Pantheon", status: "Quiet", color: "text-teal" },
  { name: "Spanish Steps", status: "Quiet", color: "text-teal" },
];

const hiddenGems = [
  { name: "Garbatella", film: "The Great Beauty", note: "Only 3% of visitors find this" },
  { name: "EUR District", film: "Various", note: "Brutalist architecture haven" },
  { name: "Cinecittà Studios Gate", film: "La Dolce Vita", note: "The Hollywood of Rome" },
  { name: "Via Appia Antica", film: "Ben-Hur", note: "Ancient road, zero crowds" },
];

const filterOptions = ["All", "Movies", "Series", "Books", "Classics (pre-1980)", "Recent (2010+)"];

export default function LocationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeSpot, setActiveSpot] = useState<number | null>(null);
  const [spotSearch, setSpotSearch] = useState("");
  const [showStickyBar, setShowStickyBar] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const titleGridRef = useRef<HTMLDivElement>(null);
  const communityRef = useRef<HTMLDivElement>(null);
  const isCommunityInView = useInView(communityRef, { once: true, margin: "-100px" });

  // Intersection observer for sticky bar
  useState(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    const el = heroRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  });

  const mapPins: MapPinType[] = filmingSpots.map((s) => ({
    lat: s.lat,
    lng: s.lng,
    label: s.name,
    title: s.titles.join(", "),
    type: "Movie" as const,
  }));

  const filteredTitles = useMemo(() => {
    if (activeFilter === "All") return romeTitles;
    if (activeFilter === "Movies") return romeTitles.filter((t) => t.type === "Movie");
    if (activeFilter === "Series") return romeTitles.filter((t) => t.type === "Series");
    if (activeFilter === "Books") return romeTitles.filter((t) => t.type === "Book");
    if (activeFilter === "Classics (pre-1980)") return romeTitles.filter((t) => t.year < 1980);
    if (activeFilter === "Recent (2010+)") return romeTitles.filter((t) => t.year >= 2010);
    return romeTitles;
  }, [activeFilter]);

  const filteredSpots = filmingSpots.filter(
    (s) =>
      s.name.toLowerCase().includes(spotSearch.toLowerCase()) ||
      s.titles.some((t) => t.toLowerCase().includes(spotSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* SECTION 1: HERO */}
      <div ref={heroRef} className="relative h-screen w-full overflow-hidden grain">
        <img
          src={heroRomeImg}
          alt="Rome at golden hour"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,13,13,0.2) 0%, rgba(13,13,13,0.5) 50%, rgba(13,13,13,0.95) 100%)",
          }}
        />
        {/* Grain */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Breadcrumb */}
        <div className="absolute top-20 left-[5%] z-10">
          <div className="text-[13px] font-sans text-muted-foreground">
            <Link to="/" className="text-amber hover:text-amber/80 transition-colors">
              Popular Filming Locations
            </Link>
            <span className="mx-2 text-muted-foreground/50">›</span>
            <span>{romeData.flag} {romeData.name}</span>
          </div>
        </div>

        {/* Bottom-left content */}
        <div className="absolute bottom-[10%] left-[5%] z-10 max-w-2xl">
          {/* Country badge + coords */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-4"
          >
            <span className="glass rounded-full px-3 py-1.5 text-sm font-medium text-foreground">
              {romeData.countryCode} {romeData.flag} {romeData.country}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-amber" />
              <span className="font-mono text-xs text-muted-foreground">
                {romeData.coords.lat}°N · {romeData.coords.lng}°E
              </span>
            </span>
          </motion.div>

          {/* City name */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="font-serif italic text-foreground leading-none mb-3"
            style={{ fontSize: "clamp(56px, 10vw, 88px)", textShadow: "0 4px 40px rgba(0,0,0,0.8)" }}
          >
            {romeData.name}
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground italic font-light text-lg mb-6"
          >
            {romeData.tagline}
          </motion.p>

          {/* Stats pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-3 mb-6"
          >
            {[
              { icon: "🎬", label: `${romeData.totalTitles} titles filmed here` },
              { icon: "📍", label: `${romeData.totalLocations} filming locations` },
              { icon: "👁️", label: `${romeData.explorers} explorers` },
            ].map((stat, i) => (
              <motion.span
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="glass rounded-full px-4 py-2 text-sm font-medium text-foreground"
              >
                <span className="mr-1.5">{stat.icon}</span>
                {stat.label}
              </motion.span>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-3"
          >
            <Link
              to="/map"
              className="px-6 py-3 rounded-full bg-gradient-amber text-charcoal font-bold text-sm hover:brightness-110 hover:scale-[1.02] transition-all shadow-amber"
            >
              Explore All Locations on Map
            </Link>
            <button className="px-6 py-3 rounded-full border border-border/40 text-foreground text-sm font-medium hover:border-amber hover:text-amber transition-all">
              <Bookmark className="w-4 h-4 inline mr-1.5" />
              Save City to My List
            </button>
            <button className="px-6 py-3 rounded-full border border-border/40 text-foreground text-sm font-medium hover:border-amber hover:text-amber transition-all">
              <Bell className="w-4 h-4 inline mr-1.5" />
              Get New Title Alerts
            </button>
            <ShareMenu
              title={`${romeData.name} Filming Locations`}
              text={`Discover ${romeData.totalLocations} filming locations in ${romeData.name}, ${romeData.country}`}
              className="px-6 py-3 rounded-full border border-border/40 text-foreground text-sm font-medium hover:border-amber hover:text-amber transition-all flex items-center gap-1.5"
            />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 right-8 z-10 hidden md:flex flex-col items-center gap-2">
          <span
            className="text-[11px] text-muted-foreground tracking-wider"
            style={{ writingMode: "vertical-rl" }}
          >
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-8 bg-amber/60"
          />
        </div>
      </div>

      {/* SECTION 2: STICKY FILTER BAR */}
      <motion.div
        initial={false}
        animate={{ y: showStickyBar ? 0 : -80 }}
        className="fixed top-16 left-0 right-0 z-40 h-16 border-b border-border/20"
        style={{
          background: "rgba(13,13,13,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Left: city pill */}
          <div className="flex items-center gap-2 shrink-0">
            <MapPin className="w-4 h-4 text-amber" />
            <span className="text-sm font-medium text-foreground">{romeData.name}</span>
            <span className="text-xs text-muted-foreground">· {romeData.totalTitles} titles</span>
          </div>

          {/* Center: filter chips */}
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {filterOptions.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeFilter === f
                    ? "bg-gradient-amber text-charcoal"
                    : "glass text-foreground hover:border-amber/40"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Right: sort */}
          <div className="hidden lg:flex items-center gap-2">
            <button className="glass rounded-lg px-3 py-1.5 text-xs text-foreground flex items-center gap-1.5">
              Sort: Most Locations <ChevronDown className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-amber bg-amber/10">
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground">
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* SECTION 3: MAP + SPOTS LIST */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col lg:flex-row gap-6" style={{ minHeight: 600 }}>
          {/* Map */}
          <div className="lg:w-[55%] h-[300px] lg:h-auto relative">
            <LeafletMap
              pins={mapPins}
              className="w-full h-full min-h-[300px] lg:min-h-[600px]"
              zoom={13}
              center={[41.9028, 12.4964]}
            />
            {/* Map vignette */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
              boxShadow: "inset 0 0 60px 20px hsl(0 0% 5% / 0.5)",
            }} />
          </div>

          {/* Spots list */}
          <div className="lg:w-[45%] flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <Link to={`/location/${slug}/filming-spots`} className="text-base font-semibold text-foreground hover:text-amber transition-colors">
                Filming Spots
              </Link>
              <span className="text-xs font-semibold text-charcoal bg-amber rounded-full px-2 py-0.5">
                {romeData.totalLocations}
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={spotSearch}
                onChange={(e) => setSpotSearch(e.target.value)}
                placeholder="Search spots in Rome..."
                className="w-full h-10 pl-9 pr-9 rounded-xl glass text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-amber/50"
              />
              {spotSearch && (
                <button onClick={() => setSpotSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Spot rows */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
              {filteredSpots.map((spot) => (
                <Link
                  key={spot.id}
                  to={`/spot/${spot.slug}`}
                >
                  <motion.div
                    onMouseEnter={() => setActiveSpot(spot.id)}
                    onMouseLeave={() => setActiveSpot(null)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                      activeSpot === spot.id
                        ? "bg-amber/[0.06] border-l-2 border-amber"
                        : "hover:bg-amber/[0.03] border-l-2 border-transparent"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        activeSpot === spot.id
                          ? "bg-amber text-charcoal"
                          : "glass text-foreground"
                      }`}
                    >
                      {spot.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{spot.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{spot.titles.join(", ")}</div>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        activeSpot === spot.id ? "text-amber" : "text-muted-foreground/40 group-hover:text-amber"
                      }`}
                    />
                  </motion.div>
                </Link>
              ))}
            </div>

            <Link
              to="/map"
              className="mt-4 text-sm text-teal hover:text-teal/80 transition-colors"
            >
              + 82 more locations — View all on full map
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 4: TITLES FILMED HERE */}
      <section ref={titleGridRef} className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-serif italic text-4xl text-foreground mb-1">Titles Filmed in Rome</h2>
            <p className="text-sm text-muted-foreground">22 movies, series and books that brought this city to screen</p>
          </div>
          <button className="text-sm text-amber hover:text-amber/80 transition-colors font-medium shrink-0 mt-2">
            View all 22 →
          </button>
        </div>

        {/* Mobile filter chips */}
        <div className="flex md:hidden gap-2 overflow-x-auto no-scrollbar mb-6">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeFilter === f
                  ? "bg-gradient-amber text-charcoal"
                  : "glass text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTitles.map((title, i) => (
            <motion.div
              key={title.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group glass rounded-2xl overflow-hidden hover:scale-[1.02] hover:shadow-amber hover:border-amber/30 transition-all duration-300 cursor-pointer"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] overflow-hidden">
                <img
                  src={title.image}
                  alt={title.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 cinema-overlay" />
                {/* Type badge */}
                <span className="absolute top-3 left-3 badge-movie text-xs font-semibold px-2.5 py-1 rounded-full">
                  {title.type}
                </span>
                {/* Year */}
                <span className="absolute top-3 right-3 glass text-xs text-muted-foreground px-2.5 py-1 rounded-full">
                  {title.year}
                </span>
              </div>
              {/* Info */}
              <div className="p-4">
                <h3 className="font-serif italic text-xl text-foreground mb-1">{title.title}</h3>
                <div className="flex items-center gap-1.5 text-amber text-sm mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="font-medium">{title.spots} filming spots in Rome</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {title.genres.map((g) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                      {g}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 mb-4">
                  <Star className="w-3.5 h-3.5 text-amber fill-amber" />
                  <span className="text-sm font-semibold text-amber">{title.rating}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex-1 px-3 py-2 rounded-xl border border-teal/30 text-teal text-xs font-semibold hover:bg-teal/10 transition-colors">
                    Explore Locations
                  </button>
                  <button className="w-9 h-9 rounded-xl flex items-center justify-center glass text-foreground hover:bg-amber/10 hover:text-amber transition-colors">
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <button className="px-8 py-3 rounded-full border border-amber/40 text-amber text-sm font-semibold hover:bg-amber/10 transition-all">
            Load More Titles
          </button>
        </div>
      </section>

      {/* SECTION 5: CITY INTEL BENTO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-serif italic text-3xl text-foreground mb-8"
        >
          Rome at a Glance
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card A: Best Time */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="md:col-span-2 glass rounded-2xl p-6 border-t-2 border-teal"
          >
            <h3 className="text-lg font-semibold text-foreground mb-1">Best Time to Visit for Filming Locations</h3>
            <p className="text-xs text-muted-foreground mb-5">Crowd levels and weather by month</p>

            <div className="flex items-end gap-2 mb-4" style={{ height: 80 }}>
              {monthData.map((m) => {
                const h = m.level * 16;
                const color =
                  m.level >= 5 ? "bg-destructive" : m.level >= 4 ? "bg-amber" : m.level >= 3 ? "bg-amber/60" : "bg-teal";
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full rounded-sm ${color}`} style={{ height: h }} />
                    <span className="text-[10px] text-muted-foreground">{m.month}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 mb-3">
              <span className="text-xs">
                <span className="inline-block w-2 h-2 rounded-full bg-destructive mr-1.5" />
                <span className="text-destructive font-medium">Overcrowded:</span>{" "}
                <span className="text-muted-foreground">Jun · Jul · Aug</span>
              </span>
              <span className="text-xs">
                <span className="inline-block w-2 h-2 rounded-full bg-teal mr-1.5" />
                <span className="text-teal font-medium">Best:</span>{" "}
                <span className="text-muted-foreground">Mar · Apr · Oct · Nov</span>
              </span>
            </div>

            <p className="text-sm text-muted-foreground italic">
              Avoid summer peak — the Colosseum queues can be 3+ hours. March gives you soft morning light and manageable crowds.
            </p>
            <p className="text-xs font-mono text-muted-foreground/60 mt-3">✓ Based on 2,847 explorer reports</p>
          </motion.div>

          {/* Card B: Getting Around */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="text-amber font-semibold mb-3 flex items-center gap-2">
              <Train className="w-4 h-4" /> Transit Tips
            </h3>
            <ul className="space-y-2.5 text-sm text-foreground mb-4">
              <li>Metro Line B → <span className="text-amber">Colosseo</span></li>
              <li>Metro Line A → <span className="text-amber">Spagna</span> (Spanish Steps)</li>
              <li>Tram 8 → Piazza Navona area</li>
            </ul>
            <p className="text-xs text-muted-foreground italic mb-4">Most filming locations are walkable from the centre</p>
            <p className="text-xs text-teal">🚶 12 of 22 titles have walkable location clusters</p>
          </motion.div>

          {/* Card C: Crowd Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber" />
              </span>
              <span className="text-foreground font-semibold text-sm">Moderate</span>
            </div>

            {/* Level bar */}
            <div className="w-full h-2 rounded-full bg-muted mb-4 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full" style={{
                width: "40%",
                background: "linear-gradient(90deg, hsl(var(--teal)), hsl(var(--amber)))",
              }} />
            </div>

            <div className="space-y-2">
              {crowdSpots.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{s.name}</span>
                  <span className={s.color + " font-medium"}>{s.status}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-4">Community reports · Updated 2h ago</p>
          </motion.div>

          {/* Card D: Hidden Gems */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="md:col-span-2 glass rounded-2xl p-6 border-t-2 border-amber"
          >
            <h3 className="font-serif italic text-xl text-foreground mb-1">Hidden Gems 💎</h3>
            <p className="text-xs text-muted-foreground mb-4">Skip the crowds. These spots are just as cinematic.</p>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {hiddenGems.map((gem) => (
                <div
                  key={gem.name}
                  className="shrink-0 w-48 h-36 glass rounded-xl p-4 flex flex-col justify-between hover:border-amber/30 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-1">{gem.name}</div>
                    <span className="badge-movie text-[10px] px-2 py-0.5 rounded-full">{gem.film}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">{gem.note}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 6: COMMUNITY PHOTOS */}
      <section ref={communityRef} className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="font-serif italic text-3xl text-foreground mb-1">Explorer Photos from Rome</h2>
        <p className="text-sm text-muted-foreground mb-8">Shot by Sarevista explorers at real filming locations</p>

        <div className="columns-2 md:columns-4 gap-3 space-y-3">
          {communityPhotos.map((photo, i) => {
            const isUpload = photo.user === "upload";
            const heights = [320, 400, 360, 280, 440, 340, 380, 300];
            const h = heights[i % heights.length];

            if (isUpload) {
              return (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isCommunityInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.06 }}
                  className="break-inside-avoid rounded-2xl border-2 border-dashed border-amber/40 flex flex-col items-center justify-center gap-3 p-6 cursor-pointer hover:border-amber hover:bg-amber/5 transition-all"
                  style={{ height: h }}
                >
                  <Camera className="w-10 h-10 text-amber" />
                  <span className="text-sm font-medium text-foreground text-center">Share your Rome discovery</span>
                  <button className="px-4 py-2 rounded-full border border-amber/40 text-amber text-xs font-semibold hover:bg-amber/10 transition-colors">
                    Upload Photo
                  </button>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isCommunityInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.06 }}
                className="break-inside-avoid relative rounded-2xl overflow-hidden group cursor-pointer"
                style={{ height: h }}
              >
                <img
                  src={[heroRomeAlt, londonImg, santoriniImg, nycImg, kyotoImg, tokyoImg, heroRomeImg][i % 7]}
                  alt={`Photo by ${photo.user}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <img
                      src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${photo.user}`}
                      alt={photo.user}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-xs text-foreground font-medium">@{photo.user}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber font-semibold">🎯 {photo.match}% Match</span>
                    <span className="text-xs text-muted-foreground">❤️ {photo.likes}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SECTION 7: RELATED LOCATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="font-serif italic text-2xl text-foreground mb-5">Also Popular in Europe</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {relatedLocations.map((loc) => (
            <Link
              key={loc.slug}
              to={`/location/${loc.slug}`}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-full glass border border-border hover:border-amber/40 hover:bg-amber/5 transition-all duration-200 shrink-0"
            >
              <span className="text-base leading-none">{loc.flag}</span>
              <span className="text-sm font-medium text-foreground">{loc.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 text-amber" />
                {loc.count} titles
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 8: CTA */}
      <section className="relative py-20 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, hsl(38 80% 56% / 0.05) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-2xl mx-auto text-center px-4 relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif italic text-foreground mb-4"
            style={{ fontSize: "clamp(32px, 5vw, 44px)" }}
          >
            Ready to walk in their footsteps?
          </motion.h2>
          <p className="text-muted-foreground mb-8">
            Let our Film Concierge AI build you a personalised Rome cinema itinerary.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <button className="relative overflow-hidden px-8 py-4 rounded-full bg-gradient-amber text-charcoal font-bold hover:brightness-110 hover:scale-[1.02] transition-all shadow-amber">
              <span className="relative z-10">🤖 Build My Rome Itinerary</span>
              <div className="absolute inset-0 shimmer-sweep" />
            </button>
            <button className="px-8 py-4 rounded-full border border-border/40 text-foreground font-medium hover:border-amber hover:text-amber transition-all">
              📥 Download Location Guide
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Free for all users · No account required to explore</p>
        </div>
      </section>

      {/* Mobile sticky bar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4 pb-2">
        <Link
          to="/map"
          className="block w-full py-3 rounded-2xl bg-gradient-amber text-charcoal text-center font-bold text-sm shadow-amber"
        >
          🎯 Explore on Map
        </Link>
      </div>
    </div>
  );
}
