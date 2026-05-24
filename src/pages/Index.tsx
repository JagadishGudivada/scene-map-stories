import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import HeroBanner from "@/components/HeroBanner";
import CinemaCard from "@/components/CinemaCard";
import TrendingRow from "@/components/TrendingRow";
import PostCard from "@/components/PostCard";
import PopularLocations from "@/components/PopularLocations";
import RecentlyVisitedSpots from "@/components/RecentlyVisitedSpots";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { useAITitleSearch, slugifyTitle } from "@/hooks/useAITitleSearch";
import { useAILocationSearch } from "@/hooks/useAILocationSearch";
import { useWeeklyCurrentYearTitles } from "@/hooks/useWeeklyCurrentYearTitles";
import { useRecentTitleDetails } from "@/hooks/useRecentTitleDetails";
import { mockPosts, type MediaType } from "@/lib/mockData";
import {
  Sparkles,
  TrendingUp,
  Globe,
  Search,
  X,
  SlidersHorizontal,
  Hash,
  MapPin,
  Film,
  ArrowRight,
  Loader2,
} from "lucide-react";

const genres = ["All", "Drama", "Romance", "Crime", "Mystery", "Musical", "Fantasy", "Self-help"];
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

export default function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedType, setSelectedType] = useState<"All" | MediaType>("All");
  const [selectedEra, setSelectedEra] = useState("All");
  const [activeSection, setActiveSection] = useState<"discover" | "community">("discover");
  const [showAIDropdown, setShowAIDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const {
    titles: weeklyTitles,
    loading: weeklyTitlesLoading,
    error: weeklyTitlesError,
    updatedAt: weeklyTitlesUpdatedAt,
  } = useWeeklyCurrentYearTitles();
  const {
    titles: recentTitles,
    loading: recentTitlesLoading,
    error: recentTitlesError,
  } = useRecentTitleDetails(5);

  const { results: aiResults, isSearching: isAISearching, error: aiError, search: searchTitles, clear: clearResults } = useAITitleSearch();
  const { aiResults: locResults, isSearching: isLocSearching, searchLocations, clearResults: clearLocations } = useAILocationSearch();

  const homepageTitles = useMemo(() => {
    if (weeklyTitles.length === 0) return [];

    const recentCountBySlug = new Map(
      recentTitles.map((title) => [slugifyTitle(title.title, title.year), title.locationCount])
    );

    return weeklyTitles.map((title) => {
      const overrideCount = recentCountBySlug.get(slugifyTitle(title.title, title.year));
      if (typeof overrideCount !== "number" || overrideCount <= 0) return title;
      return { ...title, locationCount: overrideCount };
    });
  }, [weeklyTitles, recentTitles]);

  const featuredTiles = useMemo(() => {
    const source = recentTitles.length > 0 ? recentTitles : homepageTitles;
    if (source.length === 0) return [];
    return source.slice(0, 5);
  }, [homepageTitles, recentTitles]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowAIDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchTitles(value);
    searchLocations(value);
    setShowAIDropdown(value.trim().length >= 2);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    clearResults();
    clearLocations();
    setShowAIDropdown(false);
  };

  const filteredTitles = useMemo(() => {
    return homepageTitles.filter((t) => {
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
  }, [searchQuery, selectedType, selectedGenre, selectedEra, homepageTitles]);

  const hasActiveFilters = selectedGenre !== "All" || selectedType !== "All" || selectedEra !== "All";
  const isSearching = searchQuery.length > 0 || hasActiveFilters;

  const clearFilters = () => {
    setSelectedGenre("All");
    setSelectedType("All");
    setSelectedEra("All");
    handleClearSearch();
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Seo
        title="Sarevista — Filming Locations Map for Movies, Series & Books"
        description="Discover, save, and share real filming locations from your favourite movies, series, and books. Cinema meets travel — your memory map."
      />
      {/* === HERO SECTION === */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <HeroBanner titles={homepageTitles} />
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* === SEARCH BAR (Floating, overlaps hero bottom) === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative mt-6 z-20 mb-10"
        >
          <div
            ref={searchContainerRef}
            className={`relative transition-all duration-300 rounded-2xl shadow-float ${
              searchFocused ? "ring-2 ring-amber/40" : ""
            }`}
          >
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
            {isAISearching && (
              <Loader2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber z-20 animate-spin" />
            )}
            <input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                setSearchFocused(true);
                if (aiResults.length > 0 && searchQuery.trim().length >= 3) setShowAIDropdown(true);
              }}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search titles, locations, genres..."
              className="w-full h-14 pl-14 pr-28 rounded-2xl bg-card text-foreground text-sm border border-border outline-none placeholder:text-muted-foreground transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchQuery && (
                <button onClick={handleClearSearch} className="p-1.5 rounded-lg hover:bg-muted/50">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl transition-all ${
                  showFilters || hasActiveFilters
                    ? "bg-amber/10 text-amber border border-amber/30"
                    : "glass border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="glass rounded-2xl p-5 border border-border space-y-4">
                  <FilterRow label="Type" options={mediaTypes} selected={selectedType} onSelect={setSelectedType} />
                  <FilterRow label="Genre" options={genres} selected={selectedGenre} onSelect={setSelectedGenre} />
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

          {/* AI Location Results Dropdown */}
          <AnimatePresence>
            {showAIDropdown && aiResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute left-0 right-0 mt-2 rounded-2xl glass border border-border shadow-float overflow-hidden z-30"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                  <Sparkles className="w-3.5 h-3.5 text-amber" />
                  <span className="text-xs font-medium text-amber">AI-powered titles</span>
                  <span className="ml-auto text-xs text-muted-foreground">{aiResults.length} title{aiResults.length === 1 ? "" : "s"}</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {aiResults.map((t, i) => (
                    <button
                      key={`${t.title}-${t.year}-${i}`}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => {
                        setShowAIDropdown(false);
                        navigate(`/title/${slugifyTitle(t.title, t.year)}`, { state: { title: t.title, year: t.year, type: t.type, creator: t.creator } });
                      }}
                    >
                      <Film className="w-4 h-4 text-amber shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{t.title} <span className="text-muted-foreground">({t.year})</span></p>
                        {t.creator && <p className="text-xs text-muted-foreground truncate">{t.creator}</p>}
                      </div>
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground font-medium shrink-0">
                        {t.type}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowAIDropdown(false);
                    if (aiResults[0]) {
                      const t = aiResults[0];
                      navigate(`/title/${slugifyTitle(t.title, t.year)}`, { state: { title: t.title, year: t.year, type: t.type, creator: t.creator } });
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t border-border text-sm text-amber hover:bg-muted/50 transition-colors"
                >
                  Open top result
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* === SEARCH RESULTS MODE === */}
        {isSearching ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-14"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-amber" />
                <h2 className="font-serif text-2xl text-foreground">
                  {searchQuery ? `Results for "${searchQuery}"` : "Filtered Results"}
                </h2>
                <span className="text-xs text-muted-foreground glass rounded-full px-2.5 py-1 border border-border">
                  {filteredTitles.length}
                </span>
              </div>
              <button onClick={clearFilters} className="text-sm text-amber hover:underline">
                Clear all
              </button>
            </div>

            {filteredTitles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTitles.map((title, i) => (
                  <CinemaCard key={title.id} title={title} size="md" delay={i * 0.06} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 glass rounded-2xl border border-border">
                <Film className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm mb-3">No titles match your search</p>
                <button onClick={clearFilters} className="text-amber text-sm hover:underline">
                  Clear filters
                </button>
              </div>
            )}
          </motion.section>
        ) : (
          <>
            {/* === TRENDING HASHTAGS === */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-amber" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trending</h3>
              </div>
              {weeklyTitlesUpdatedAt && (
                <p className="text-xs text-muted-foreground mb-3">
                  Updated weekly · Last refresh {new Date(weeklyTitlesUpdatedAt).toLocaleDateString()}
                </p>
              )}
              {weeklyTitlesError && !weeklyTitlesLoading && (
                <p className="text-xs text-muted-foreground mb-3">Live update unavailable, showing fallback titles.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => setSearchQuery(t.tag.replace("#", ""))}
                    className="glass rounded-full px-4 py-2 border border-border text-sm text-foreground hover:border-amber/30 hover:text-amber transition-all group"
                  >
                    <span className="text-amber">{t.tag}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">{t.count}</span>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* === SECTION TABS === */}
            <div className="flex items-center gap-1 mb-8 border-b border-border">
              <button
                onClick={() => setActiveSection("discover")}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeSection === "discover"
                    ? "border-amber text-amber"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Discover
                </span>
              </button>
              <button
                onClick={() => setActiveSection("community")}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeSection === "community"
                    ? "border-amber text-amber"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Community
                </span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeSection === "discover" ? (
                <motion.div
                  key="discover"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Trending Row */}
                  <div className="mb-14">
                    <TrendingRow titles={homepageTitles} />
                  </div>

                  {/* Bento Grid */}
                  <section className="mb-14">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-amber" />
                        <h2 className="font-serif text-2xl text-foreground">Recently Added</h2>
                      </div>
                    </div>

                    {recentTitlesLoading && (
                      <p className="text-xs text-muted-foreground mb-3">Loading latest cached title details...</p>
                    )}
                    {recentTitlesError && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Unable to read latest cached details, showing fallback titles.
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-auto">
                      {featuredTiles.length > 0 ? (
                        <>
                          {featuredTiles[0] && (
                            <div className="col-span-2 row-span-2">
                              <CinemaCard title={featuredTiles[0]} size="lg" delay={0} showLocationNames={false} />
                            </div>
                          )}
                          {featuredTiles[1] && (
                            <div className="col-span-1">
                              <CinemaCard title={featuredTiles[1]} size="md" delay={0.1} showLocationNames={false} />
                            </div>
                          )}
                          {featuredTiles[2] && (
                            <div className="col-span-1">
                              <CinemaCard title={featuredTiles[2]} size="md" delay={0.15} showLocationNames={false} />
                            </div>
                          )}
                          {featuredTiles[3] && (
                            <div className="col-span-1">
                              <CinemaCard title={featuredTiles[3]} size="md" delay={0.2} showLocationNames={false} />
                            </div>
                          )}
                          {featuredTiles[4] && (
                            <div className="col-span-1">
                              <CinemaCard title={featuredTiles[4]} size="md" delay={0.25} showLocationNames={false} />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="col-span-2 md:col-span-3 lg:col-span-4 glass rounded-2xl border border-border p-8 text-center">
                          <p className="text-sm text-muted-foreground">No current-year titles available yet.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Popular Locations */}
                  <div className="mb-14">
                    <PopularLocations />
                  </div>

                  {/* Recently Visited by Community */}
                  <RecentlyVisitedSpots />

                  {/* Map CTA Strip */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-14"
                  >
                    <Link
                      to="/map"
                      className="flex items-center justify-between p-6 rounded-2xl glass border border-border hover:border-amber/30 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-amber flex items-center justify-center shrink-0">
                          <MapPin className="w-6 h-6 text-charcoal" />
                        </div>
                        <div>
                          <h3 className="font-serif text-xl text-foreground mb-0.5">Explore the World Map</h3>
                          <p className="text-sm text-muted-foreground">
                            200+ filming locations plotted across 30 countries
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber group-hover:translate-x-1 transition-all" />
                    </Link>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="community"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Community Posts */}
                  <section className="mb-14">
                    <div className="flex items-center gap-3 mb-5">
                      <Sparkles className="w-5 h-5 text-amber" />
                      <h2 className="font-serif text-2xl text-foreground">For You</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {mockPosts.map((post, i) => (
                        <PostCard key={post.id} post={post} delay={i * 0.08} />
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom CTA */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-10 rounded-2xl overflow-hidden relative"
            >
              <div className="glass border border-amber/20 p-10 text-center relative z-10">
                <div className="inline-flex items-center gap-2 mb-4 glass rounded-full px-4 py-2 border border-amber/20">
                  <Sparkles className="w-4 h-4 text-amber" />
                  <span className="text-sm font-medium text-amber">Join 40,000+ film explorers</span>
                </div>
                <h2 className="font-serif text-4xl text-foreground mb-4">
                  Start mapping your<br />
                  <span className="text-amber-gradient italic">cinema memories</span>
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Discover filming locations from your favourite titles and map the places that made those scenes unforgettable.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link
                    to="/auth"
                    className="px-8 py-3 rounded-xl bg-gradient-amber text-charcoal font-bold hover:opacity-90 transition-opacity shadow-amber"
                  >
                    Create Free Account
                  </Link>
                  <Link
                    to="/map"
                    className="px-8 py-3 rounded-xl glass border border-border text-foreground font-medium hover:glass-hover transition-all"
                  >
                    Explore Map
                  </Link>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-amber/5 via-transparent to-teal/5 pointer-events-none" />
            </motion.section>
          </>
        )}
      </div>
      <Footer />
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
                : "bg-muted/50 text-muted-foreground border border-border hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
