import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, MapPin, Film, Tv, BookOpen, Route, ExternalLink } from "lucide-react";
import LeafletMap, { type MapPin as MapPinType } from "@/components/LeafletMap";
import { allMapPins } from "@/lib/mapData";
import type { MediaType } from "@/lib/mockData";
import { Switch } from "@/components/ui/switch";

const mediaTypes: ("All" | MediaType)[] = ["All", "Movie", "Series", "Book"];
const typeIcons = { Movie: Film, Series: Tv, Book: BookOpen };

const typeColorMap: Record<MediaType, string> = {
  Movie: "bg-amber/15 text-amber",
  Series: "bg-teal/15 text-teal",
  Book: "bg-purple-400/15 text-purple-400",
};

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"All" | MediaType>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null);
  const [pathMode, setPathMode] = useState(false);

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

  const handlePinClick = useCallback((pin: MapPinType) => {
    setSelectedPin(pin);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Full-height map with overlay controls */}
      <div className="fixed inset-0 pt-16">
        <LeafletMap
          pins={filteredPins}
          center={center}
          zoom={3}
          className="h-full w-full rounded-none border-0"
          onPinClick={handlePinClick}
          pathMode={pathMode}
          pathPins={filteredPins}
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
          </motion.div>
        </div>

        {/* Path Mode + Pin count — bottom left */}
        <div className="absolute bottom-24 md:bottom-8 left-4 z-[1000] flex flex-col gap-2">
          {/* Path Mode toggle */}
          <div className="glass rounded-xl px-4 py-2.5 border border-border shadow-card">
            <div className="flex items-center gap-3">
              <Route className="w-4 h-4 text-amber" />
              <span className="text-xs font-medium text-foreground">Path Mode</span>
              <Switch checked={pathMode} onCheckedChange={setPathMode} />
            </div>
          </div>
          {/* Pin count badge */}
          <div className="glass rounded-xl px-4 py-2.5 border border-border shadow-card">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber" />
              <span className="text-sm font-medium text-foreground">{filteredPins.length}</span>
              <span className="text-xs text-muted-foreground">locations</span>
            </div>
          </div>
        </div>

        {/* Location sidebar list (desktop) — hidden when side panel is open */}
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
                    onClick={() => setSelectedPin(pin)}
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
        )}

        {/* Sliding side panel */}
        <AnimatePresence>
          {selectedPin && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute top-0 right-0 bottom-0 w-full sm:w-96 z-[1100] glass border-l border-border shadow-float flex flex-col"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedPin(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl glass border border-border hover:bg-muted/50 transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>

              {/* Location image */}
              <div className="relative h-56 sm:h-64 shrink-0 overflow-hidden">
                <img
                  src={selectedPin.image || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop`}
                  alt={selectedPin.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                {/* Type badge */}
                <div className="absolute bottom-4 left-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${typeColorMap[selectedPin.type]}`}>
                    {selectedPin.type === "Movie" && <Film className="w-3 h-3" />}
                    {selectedPin.type === "Series" && <Tv className="w-3 h-3" />}
                    {selectedPin.type === "Book" && <BookOpen className="w-3 h-3" />}
                    {selectedPin.type}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-5">
                <div>
                  <h2 className="font-serif text-2xl text-foreground">{selectedPin.label}</h2>
                  {selectedPin.title && (
                    <p className="text-sm text-muted-foreground mt-1">Featured in <span className="text-amber font-medium">{selectedPin.title}</span></p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{selectedPin.lat.toFixed(4)}°N, {selectedPin.lng.toFixed(4)}°E</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Discover this iconic filming location from <span className="text-foreground font-medium">{selectedPin.title}</span>.
                    Visit the real-world spot and capture your own cinematic moment.
                  </p>
                </div>

                <a
                  href={`https://www.google.com/maps/@${selectedPin.lat},${selectedPin.lng},15z`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber text-background font-medium text-sm hover:bg-amber/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Google Maps
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
