import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, MapPin, Film, Tv, BookOpen } from "lucide-react";
import LeafletMap from "@/components/LeafletMap";
import { allMapPins } from "@/lib/mapData";
import type { MediaType } from "@/lib/mockData";

const mediaTypes: ("All" | MediaType)[] = ["All", "Movie", "Series", "Book"];
const typeIcons = { Movie: Film, Series: Tv, Book: BookOpen };

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"All" | MediaType>("All");
  const [showFilters, setShowFilters] = useState(false);

  const filteredPins = useMemo(() => {
    return allMapPins.filter((pin) => {
      if (selectedType !== "All" && pin.type !== selectedType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!pin.label.toLowerCase().includes(q) && !(pin.title?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [searchQuery, selectedType]);

  const center: [number, number] = filteredPins.length
    ? [
        filteredPins.reduce((s, p) => s + p.lat, 0) / filteredPins.length,
        filteredPins.reduce((s, p) => s + p.lng, 0) / filteredPins.length,
      ]
    : [30, 10];

  return (
    <div className="min-h-screen bg-background">
      {/* Full-height map with overlay controls */}
      <div className="fixed inset-0 pt-16">
        <LeafletMap pins={filteredPins} center={center} zoom={3} className="h-full w-full rounded-none border-0" />

        {/* Floating search & filter bar */}
        <div className="absolute top-4 left-4 right-4 z-[1000] max-w-xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="glass rounded-2xl border border-border overflow-hidden shadow-card">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-muted-foreground z-10" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search locations, titles..."
                  className="w-full h-12 pl-12 pr-24 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                />
                <div className="absolute right-3 flex items-center gap-2">
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="p-1.5 rounded-lg hover:bg-muted/50">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-xl transition-all ${
                      showFilters || selectedType !== "All"
                        ? "bg-amber/10 text-amber border border-amber/30"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter chips */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 border-t border-border flex flex-wrap gap-2">
                      {mediaTypes.map((t) => {
                        const Icon = t === "All" ? MapPin : typeIcons[t];
                        return (
                          <button
                            key={t}
                            onClick={() => setSelectedType(t)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              selectedType === t
                                ? "bg-amber/15 text-amber border border-amber/30"
                                : "bg-muted/50 text-muted-foreground border border-border hover:text-foreground"
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Pin count badge */}
        <div className="absolute bottom-24 md:bottom-8 left-4 z-[1000]">
          <div className="glass rounded-xl px-4 py-2.5 border border-border shadow-card">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber" />
              <span className="text-sm font-medium text-foreground">{filteredPins.length}</span>
              <span className="text-xs text-muted-foreground">locations</span>
            </div>
          </div>
        </div>

        {/* Location sidebar list (desktop) */}
        <div className="hidden lg:block absolute top-4 right-4 bottom-8 w-80 z-[1000]">
          <div className="glass rounded-2xl border border-border shadow-card h-full flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-serif text-lg text-foreground">Locations</h2>
              <p className="text-xs text-muted-foreground">{filteredPins.length} pinned spots</p>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
              {filteredPins.map((pin, i) => (
                <motion.div
                  key={`${pin.lat}-${pin.lng}-${i}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 badge-${pin.type.toLowerCase()}`}>
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pin.label}</p>
                    {pin.title && (
                      <p className="text-xs text-muted-foreground truncate">{pin.title}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
