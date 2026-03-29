import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, MapPin, Film, Tv, BookOpen, Route } from "lucide-react";
import L from "leaflet";
import LeafletMap, { type MapPin as MapPinType } from "@/components/LeafletMap";
import MapSidePanel from "@/components/MapSidePanel";
import { allMapPins } from "@/lib/mapData";
import type { MediaType } from "@/lib/mockData";
import { Switch } from "@/components/ui/switch";

const mediaTypes: ("All" | MediaType)[] = ["All", "Movie", "Series", "Book"];
const typeIcons = { Movie: Film, Series: Tv, Book: BookOpen };

const typeBadgeClasses: Record<MediaType, string> = {
  Movie: "badge-movie",
  Series: "badge-series",
  Book: "badge-book",
};

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"All" | MediaType>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null);
  const [pathMode, setPathMode] = useState(false);
  const [highlightedPin, setHighlightedPin] = useState<MapPinType | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

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

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return allMapPins
      .filter((pin) => pin.label.toLowerCase().includes(q) || pin.title?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery]);

  const center: [number, number] = filteredPins.length
    ? [
        filteredPins.reduce((s, p) => s + p.lat, 0) / filteredPins.length,
        filteredPins.reduce((s, p) => s + p.lng, 0) / filteredPins.length,
      ]
    : [30, 10];

  const handlePinClick = useCallback((pin: MapPinType) => {
    setSelectedPin(pin);
    setHighlightedPin(pin);
  }, []);

  const handleSearchResultClick = useCallback((pin: MapPinType) => {
    setSearchQuery("");
    setSelectedPin(pin);
    setHighlightedPin(pin);
    mapInstanceRef.current?.flyTo([pin.lat, pin.lng], 14, { duration: 1.5 });
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedPin(null);
    setHighlightedPin(null);
  }, []);

  const handleMapReady = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pt-16">
        <LeafletMap
          pins={filteredPins}
          center={center}
          zoom={3}
          className="h-full w-full rounded-none border-0"
          onPinClick={handlePinClick}
          pathMode={pathMode}
          pathPins={filteredPins}
          onMapReady={handleMapReady}
          highlightedPin={highlightedPin}
        />

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

            {/* Search dropdown */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="mt-2 glass rounded-xl border border-border shadow-card overflow-hidden"
                >
                  <div className="max-h-80 overflow-y-auto no-scrollbar">
                    {searchResults.map((pin, i) => (
                      <button
                        key={`${pin.lat}-${pin.lng}-${i}`}
                        onClick={() => handleSearchResultClick(pin)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-b-0"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${typeBadgeClasses[pin.type]}`}>
                          <MapPin className="w-3 h-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{pin.label}</p>
                          {pin.title && (
                            <p className="text-xs text-muted-foreground truncate">{pin.title}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider shrink-0">
                          {pin.type}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Path Mode + Pin count */}
        <div className="absolute bottom-24 md:bottom-8 left-4 z-[1000] flex flex-col gap-2">
          <div className="glass rounded-xl px-4 py-2.5 border border-border shadow-card">
            <div className="flex items-center gap-3">
              <Route className="w-4 h-4 text-amber" />
              <span className="text-xs font-medium text-foreground">Path Mode</span>
              <Switch checked={pathMode} onCheckedChange={setPathMode} />
            </div>
          </div>
          <div className="glass rounded-xl px-4 py-2.5 border border-border shadow-card">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber" />
              <span className="text-sm font-medium text-foreground">{filteredPins.length}</span>
              <span className="text-xs text-muted-foreground">locations</span>
            </div>
          </div>
        </div>

        {/* Location sidebar list (desktop) */}
        {!selectedPin && (
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
                    onClick={() => handleSearchResultClick(pin)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeBadgeClasses[pin.type]}`}>
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
        )}

        {/* Sliding side panel */}
        <AnimatePresence>
          {selectedPin && (
            <MapSidePanel
              pin={selectedPin}
              allPins={filteredPins}
              onClose={handleClosePanel}
              onSelectPin={handlePinClick}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
