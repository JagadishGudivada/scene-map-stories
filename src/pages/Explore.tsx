import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, Sparkles, TrendingUp, Hash } from "lucide-react";
import { mockTitles, mockPosts, type MediaType } from "@/lib/mockData";
import CinemaCard from "@/components/CinemaCard";
import PostCard from "@/components/PostCard";

const genres = ["All", "Drama", "Romance", "Crime", "Mystery", "Musical", "Fantasy", "Self-help"];
const countries = ["All", "Japan", "UK", "USA", "Greece", "Scotland", "Italy", "France"];
const mediaTypes: ("All" | MediaType)[] = ["All", "Movie", "Series", "Book"];
const eras = ["All", "2000s", "2010s", "Pre-2000"];

const trendingTags = [
  { tag: "#TokyoFilmSpots", count: "2.4k" },
  { tag: "#LondonOnScreen", count: "1.8k" },
  { tag: "#CinemaTravel", count: "5.1k" },
  { tag: "#ScottishHighlands", count: "980" },
  { tag: "#GreekIslands", count: "1.3k" },
  { tag: "#FilmPilgrimage", count: "3.2k" },
  { tag: "#BookLocations", count: "720" },
  { tag: "#RomeEternal", count: "1.1k" },
];

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedType, setSelectedType] = useState<"All" | MediaType>("All");
  const [selectedEra, setSelectedEra] = useState("All");

  const filteredTitles = useMemo(() => {
    return mockTitles.filter((t) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedType !== "All" && t.type !== selectedType) return false;
      if (selectedGenre !== "All" && !t.genres.includes(selectedGenre)) return false;
      if (selectedEra !== "All") {
        if (selectedEra === "2000s" && (t.year < 2000 || t.year >= 2010)) return false;
        if (selectedEra === "2010s" && (t.year < 2010 || t.year >= 2020)) return false;
        if (selectedEra === "Pre-2000" && t.year >= 2000) return false;
      }
      return true;
    });
  }, [searchQuery, selectedType, selectedGenre, selectedEra]);

  const hasActiveFilters = selectedGenre !== "All" || selectedCountry !== "All" || selectedType !== "All" || selectedEra !== "All";

  const clearFilters = () => {
    setSelectedGenre("All");
    setSelectedCountry("All");
    setSelectedType("All");
    setSelectedEra("All");
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-serif text-4xl text-foreground mb-2">Explore</h1>
          <p className="text-muted-foreground text-sm">Discover filming locations from titles you love</p>
        </motion.div>

        {/* Expanding Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div
            className={`relative transition-all duration-300 ${
              searchFocused ? "ring-2 ring-amber/50" : ""
            } rounded-2xl`}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search titles, locations, users, lists..."
              className="w-full h-14 pl-12 pr-24 rounded-2xl bg-card text-foreground text-sm border border-border outline-none placeholder:text-muted-foreground transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-1.5 rounded-lg hover:bg-muted/50">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-xl transition-all ${
                  showFilters || hasActiveFilters
                    ? "bg-amber/10 text-amber border border-amber/30"
                    : "glass border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filter Panels */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="glass rounded-2xl p-5 border border-border space-y-4">
                {/* Media Type */}
                <FilterRow label="Type" options={mediaTypes} selected={selectedType} onSelect={setSelectedType} />
                <FilterRow label="Genre" options={genres} selected={selectedGenre} onSelect={setSelectedGenre} />
                <FilterRow label="Country" options={countries} selected={selectedCountry} onSelect={setSelectedCountry} />
                <FilterRow label="Era" options={eras} selected={selectedEra} onSelect={setSelectedEra} />

                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-amber hover:underline mt-2">
                    Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trending Hashtags */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-4 h-4 text-amber" />
            <h2 className="font-serif text-lg text-foreground">Trending</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map((t) => (
              <button
                key={t.tag}
                onClick={() => setSearchQuery(t.tag.replace("#", ""))}
                className="glass rounded-full px-4 py-2 border border-border text-sm text-foreground hover:border-amber/30 hover:text-amber transition-all group"
              >
                <span className="text-amber group-hover:text-amber">{t.tag}</span>
                <span className="text-muted-foreground ml-1.5 text-xs">{t.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* For You Recommendations */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-amber" />
            <h2 className="font-serif text-2xl text-foreground">For You</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mockPosts.map((post, i) => (
              <PostCard key={post.id} post={post} delay={i * 0.08} />
            ))}
          </div>
        </section>

        {/* Title Results */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-teal" />
            <h2 className="font-serif text-2xl text-foreground">
              {searchQuery || hasActiveFilters ? "Results" : "All Titles"}
            </h2>
            <span className="text-xs text-muted-foreground glass rounded-full px-2 py-0.5 border border-border">
              {filteredTitles.length}
            </span>
          </div>

          {filteredTitles.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTitles.map((title, i) => (
                <CinemaCard key={title.id} title={title} size="md" delay={i * 0.06} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 glass rounded-2xl border border-border">
              <p className="text-muted-foreground text-sm">No titles match your filters</p>
              <button onClick={clearFilters} className="mt-3 text-amber text-sm hover:underline">
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: any) => void;
}) {
  return (
    <div>
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 block">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selected === opt
                ? "bg-amber/15 text-amber border border-amber/30"
                : "bg-muted/50 text-muted-foreground border border-border hover:border-border hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
