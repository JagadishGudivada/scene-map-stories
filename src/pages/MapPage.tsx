import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, MapPin, Film, Tv, BookOpen, Route, Sparkles, Loader2, Navigation, LocateFixed } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import LeafletMap, { type AppMap, type MapPin as MapPinType } from "@/components/LeafletMap";
import LocationDetailPanel from "@/components/map/LocationDetailPanel";
import MapVignette from "@/components/map/MapVignette";
import MapPinHalo from "@/components/map/MapPinHalo";
import type { MediaType } from "@/lib/mockData";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useAILocationSearch } from "@/hooks/useAILocationSearch";
import { useConsolidatedMapPins } from "@/hooks/useConsolidatedMapPins";
import { useNearbySpots } from "@/hooks/useNearbySpots";
import { toast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { isDisplayableTitle } from "@/lib/utils";


const mediaTypes: ("All" | MediaType)[] = ["All", "Movie", "Series", "Book"];
const typeIcons = { Movie: Film, Series: Tv, Book: BookOpen };

const typeBadgeClasses: Record<MediaType, string> = {
  Movie: "badge-movie",
  Series: "badge-series",
  Book: "badge-book",
};

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"All" | MediaType>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null);
  const [pathMode, setPathMode] = useState(false);
  const [nearMeMode, setNearMeMode] = useState(false);
  const [nearMeCenter, setNearMeCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeRadius, setNearMeRadius] = useState(25);
  const [highlightedPin, setHighlightedPin] = useState<MapPinType | null>(null);
  const mapInstanceRef = useRef<AppMap | null>(null);
  const initializedRef = useRef(false);
  const { aiResults, isSearching, aiError, searchLocations, clearResults } = useAILocationSearch();
  const { pins: titlePins } = useConsolidatedMapPins();
  const { nearbyPins, loading: nearbyLoading } = useNearbySpots(nearMeCenter, nearMeRadius, nearMeMode);

  // Base pins shown on the map come from stored title payload locations.
  const basePins = titlePins;


  // Handle URL search params from homepage
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlSearch = searchParams.get("search");
    const urlLat = searchParams.get("lat");
    const urlLng = searchParams.get("lng");

    if (urlSearch) {
      setSearchQuery(urlSearch);
      searchLocations(urlSearch);
    } else if (urlLat && urlLng) {
      const lat = parseFloat(urlLat);
      const lng = parseFloat(urlLng);
      if (!isNaN(lat) && !isNaN(lng) && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 });
      }
    }
  }, [searchParams, searchLocations]);

  // Fly to URL coordinates once map is ready
  useEffect(() => {
    const urlLat = searchParams.get("lat");
    const urlLng = searchParams.get("lng");
    if (urlLat && urlLng && mapInstanceRef.current) {
      const lat = parseFloat(urlLat);
      const lng = parseFloat(urlLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 });
      }
    }
  }, [searchParams]);

  // Trigger AI search when query changes
  useEffect(() => {
    searchLocations(searchQuery);
  }, [searchQuery, searchLocations]);

  // Combine local pins with AI results
  const combinedPins = useMemo(() => {
    if (aiResults.length > 0) {
      // Deduplicate by lat/lng proximity
      const merged = [...basePins];
      for (const ai of aiResults) {
        const exists = merged.some(
          (p) => Math.abs(p.lat - ai.lat) < 0.01 && Math.abs(p.lng - ai.lng) < 0.01
        );
        if (!exists) merged.push(ai);
      }
      return merged;
    }
    return basePins;
  }, [aiResults, basePins]);

  const filteredPins = useMemo(() => {
    return combinedPins.filter((pin) => {
      if (selectedType !== "All" && pin.type !== selectedType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!pin.label.toLowerCase().includes(q) && !(pin.title?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [searchQuery, selectedType, combinedPins]);

  // Search results: show AI results first, then local matches
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const localMatches = basePins
      .filter((pin) => pin.label.toLowerCase().includes(q) || pin.title?.toLowerCase().includes(q));
    
    // Combine AI + local, deduplicate
    const combined: MapPinType[] = [];
    const seen = new Set<string>();

    for (const pin of [...aiResults, ...localMatches]) {
      const key = `${pin.lat.toFixed(3)}-${pin.lng.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(pin);
      }
    }
    return combined.slice(0, 10);
  }, [searchQuery, aiResults, basePins]);

  // When AI results come in, fit map to show them
  useEffect(() => {
    if (aiResults.length > 0 && mapInstanceRef.current) {
      let minLat = aiResults[0].lat;
      let maxLat = aiResults[0].lat;
      let minLng = aiResults[0].lng;
      let maxLng = aiResults[0].lng;

      aiResults.forEach((point) => {
        minLat = Math.min(minLat, point.lat);
        maxLat = Math.max(maxLat, point.lat);
        minLng = Math.min(minLng, point.lng);
        maxLng = Math.max(maxLng, point.lng);
      });

      mapInstanceRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 60, duration: 1500 }
      );
    }
  }, [aiResults]);

  const center: [number, number] = filteredPins.length
    ? [
        filteredPins.reduce((s, p) => s + p.lat, 0) / filteredPins.length,
        filteredPins.reduce((s, p) => s + p.lng, 0) / filteredPins.length,
      ]
    : [30, 10];

  const handlePinClick = useCallback((pin: MapPinType) => {
    setSelectedPin(pin);
    setHighlightedPin(null);
  }, []);

  const handleSearchResultClick = useCallback((pin: MapPinType) => {
    setSearchQuery("");
    clearResults();
    setSelectedPin(pin);
    setHighlightedPin(pin);
    mapInstanceRef.current?.flyTo({ center: [pin.lng, pin.lat], zoom: 14, duration: 1500 });
    setTimeout(() => setHighlightedPin(null), 2500);
  }, [clearResults]);

  const handleClosePanel = useCallback(() => {
    setSelectedPin(null);
    setHighlightedPin(null);
  }, []);

  const handleMapReady = useCallback((map: AppMap) => {
    mapInstanceRef.current = map;
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    clearResults();
  }, [clearResults]);

  const handleMapClick = useCallback((lng: number, lat: number) => {
    if (!nearMeMode) return;
    setNearMeCenter({ lat, lng });
    setSelectedPin(null);
    mapInstanceRef.current?.flyTo({ center: [lng, lat], zoom: 11, duration: 1200 });
  }, [nearMeMode]);

  const handleUseMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast({ title: "Geolocation unavailable", description: "Your browser doesn't support location access." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setNearMeMode(true);
        setNearMeCenter({ lat, lng });
        mapInstanceRef.current?.flyTo({ center: [lng, lat], zoom: 11, duration: 1500 });
      },
      (err) => {
        toast({ title: "Couldn't get location", description: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const toggleNearMe = useCallback((on: boolean) => {
    setNearMeMode(on);
    if (!on) setNearMeCenter(null);
  }, []);

  // Determine which pins to show on map
  const displayPins = useMemo(() => {
    if (nearMeMode && nearMeCenter) {
      return nearbyPins;
    }
    if (aiResults.length > 0) {
      return [...filteredPins, ...aiResults.filter(
        (ai) => !filteredPins.some((p) => Math.abs(p.lat - ai.lat) < 0.01 && Math.abs(p.lng - ai.lng) < 0.01)
      )];
    }
    return filteredPins;
  }, [nearMeMode, nearMeCenter, nearbyPins, aiResults, filteredPins]);

  // Locations sidebar is a flat, already-loaded list, so filtering it is instant client-side.
  const sidebarFilteredPins = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    if (!q) return displayPins;
    return displayPins.filter(
      (pin) => pin.label.toLowerCase().includes(q) || pin.title?.toLowerCase().includes(q)
    );
  }, [displayPins, sidebarQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Discovery Map — Filming Locations Worldwide"
        description="Explore an interactive world map of filming locations from movies, series, and books. Plan your next cinematic trip."
      />
      <div className="fixed inset-0 pt-16 md:pt-20">
        <LeafletMap
          pins={displayPins}
          center={center}
          zoom={3}
          className="h-full w-full rounded-none border-0"
          onPinClick={handlePinClick}
          pathMode={pathMode}
          pathPins={displayPins}
          onMapReady={handleMapReady}
          highlightedPin={highlightedPin}
          onMapClick={handleMapClick}
          radiusCircle={nearMeMode && nearMeCenter ? { ...nearMeCenter, km: nearMeRadius } : null}
        />


        {/* Floating search & filter bar */}
        <div className="absolute top-4 left-4 right-4 z-[1000] max-w-xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="glass rounded-2xl border border-border overflow-hidden shadow-card">
              <div className="relative flex items-center">
                {isSearching ? (
                  <Loader2 className="absolute left-4 w-5 h-5 text-amber z-10 animate-spin" />
                ) : (
                  <Search className="absolute left-4 w-5 h-5 text-muted-foreground z-10" />
                )}
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies, series, books, locations..."
                  className="w-full h-12 pl-12 pr-24 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                />
                <div className="absolute right-3 flex items-center gap-2">
                  {searchQuery && (
                    <button onClick={handleClearSearch} className="p-1.5 rounded-lg hover:bg-muted/50">
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
              {(searchResults.length > 0 || isSearching || aiError) && searchQuery.length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="mt-2 glass rounded-xl border border-border shadow-card overflow-hidden"
                >
                  {/* AI indicator */}
                  <div className="px-4 py-2 border-b border-border/50 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber" />
                    <span className="text-[11px] font-medium text-amber">
                      {isSearching ? "Searching with AI..." : "AI-powered results"}
                    </span>
                    {aiResults.length > 0 && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {aiResults.length}  + {searchResults.length - aiResults.length > 0 ? `${searchResults.length - aiResults.length} local` : ""}
                      </span>
                    )}
                  </div>

                  {aiError && (
                    <div className="px-4 py-2 text-xs text-destructive">{aiError}</div>
                  )}

                  <div className="max-h-80 overflow-y-auto no-scrollbar">
                    {searchResults.map((pin, i) => {
                      const isAI = aiResults.some(
                        (ai) => Math.abs(ai.lat - pin.lat) < 0.01 && Math.abs(ai.lng - pin.lng) < 0.01
                      );
                      return (
                        <button
                          key={`${pin.lat}-${pin.lng}-${i}`}
                          onClick={() => handleSearchResultClick(pin)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-b-0"
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${typeBadgeClasses[pin.type]}`}>
                            {isAI ? <Sparkles className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{pin.label}</p>
                            {isDisplayableTitle(pin.title) && (
                              <p className="text-xs text-muted-foreground truncate">{pin.title}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider shrink-0">
                            {pin.type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Path Mode + Near Me + Pin count */}
        <div className="absolute bottom-24 md:bottom-8 left-4 z-[1000]">
          {/* Mobile: collapse into a drawer trigger instead of floating over the map */}
          <button
            onClick={() => setMobileControlsOpen(true)}
            className="md:hidden flex items-center gap-2 rounded-full bg-card/95 backdrop-blur-sm border border-border shadow-card pl-3 pr-4 py-2.5 text-xs font-medium text-foreground"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber shrink-0" />
            Map controls
          </button>

          <div className="hidden md:flex md:flex-col gap-2 w-64">
            <div className="bg-card/95 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-border shadow-card">
              <div className="flex items-center gap-3">
                <Route className="w-4 h-4 text-amber shrink-0" />
                <span className="text-xs font-medium text-foreground flex-1">Path Mode</span>
                <Switch checked={pathMode} onCheckedChange={setPathMode} />
              </div>
            </div>

            <div className="bg-card/95 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-border shadow-card">
              <div className="flex items-center gap-3">
                <Navigation className="w-4 h-4 text-amber shrink-0" />
                <span className="text-xs font-medium text-foreground flex-1">Near Me</span>
                <Switch checked={nearMeMode} onCheckedChange={toggleNearMe} />
              </div>
              <AnimatePresence>
                {nearMeMode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 10 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-muted-foreground">Radius</span>
                      <span className="text-[11px] font-semibold text-amber">{nearMeRadius} km</span>
                    </div>
                    <Slider
                      value={[nearMeRadius]}
                      onValueChange={(v) => setNearMeRadius(v[0])}
                      min={5}
                      max={200}
                      step={5}
                    />
                    <button
                      onClick={handleUseMyLocation}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-amber/10 hover:bg-amber/20 border border-amber/30 text-amber text-xs font-medium transition-colors"
                    >
                      <LocateFixed className="w-3.5 h-3.5" />
                      Use my location
                    </button>
                    {!nearMeCenter && (
                      <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
                        Click anywhere on the map to find filming spots nearby.
                      </p>
                    )}
                    {nearMeCenter && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {nearbyLoading ? "Searching…" : `${nearbyPins.length} spot${nearbyPins.length === 1 ? "" : "s"} within ${nearMeRadius} km`}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-card/95 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-border shadow-card">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber shrink-0" />
                <span className="text-sm font-medium text-foreground">{displayPins.length}</span>
                <span className="text-xs text-muted-foreground">locations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile drawer: same controls, full-width bottom sheet instead of a floating panel */}
        <Drawer open={mobileControlsOpen} onOpenChange={setMobileControlsOpen}>
          <DrawerContent className="md:hidden">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="font-serif text-lg">Map controls</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 flex flex-col gap-3">
              <div className="rounded-xl px-4 py-3 border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Route className="w-4 h-4 text-amber shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">Path Mode</span>
                  <Switch checked={pathMode} onCheckedChange={setPathMode} />
                </div>
              </div>

              <div className="rounded-xl px-4 py-3 border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Navigation className="w-4 h-4 text-amber shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">Near Me</span>
                  <Switch checked={nearMeMode} onCheckedChange={toggleNearMe} />
                </div>
                {nearMeMode && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Radius</span>
                      <span className="text-xs font-semibold text-amber">{nearMeRadius} km</span>
                    </div>
                    <Slider
                      value={[nearMeRadius]}
                      onValueChange={(v) => setNearMeRadius(v[0])}
                      min={5}
                      max={200}
                      step={5}
                    />
                    <button
                      onClick={handleUseMyLocation}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber/10 hover:bg-amber/20 border border-amber/30 text-amber text-sm font-medium transition-colors"
                    >
                      <LocateFixed className="w-4 h-4" />
                      Use my location
                    </button>
                    {!nearMeCenter && (
                      <p className="mt-2 text-xs text-muted-foreground leading-snug">
                        Click anywhere on the map to find filming spots nearby.
                      </p>
                    )}
                    {nearMeCenter && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {nearbyLoading ? "Searching…" : `${nearbyPins.length} spot${nearbyPins.length === 1 ? "" : "s"} within ${nearMeRadius} km`}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl px-4 py-3 border border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber shrink-0" />
                  <span className="text-sm font-medium text-foreground">{displayPins.length}</span>
                  <span className="text-xs text-muted-foreground">locations</span>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Location sidebar list (desktop) */}
        {!selectedPin && (
          <div className="hidden md:block absolute top-20 right-4 bottom-8 w-80 z-[1000]">
            <div className="bg-card/95 backdrop-blur-sm rounded-2xl border border-border shadow-card h-full flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border space-y-2">
                <h2 className="font-serif text-lg text-foreground">Locations</h2>
                <p className="text-xs text-muted-foreground">
                  {sidebarQuery
                    ? `${sidebarFilteredPins.length} of ${displayPins.length} spots`
                    : `${displayPins.length} pinned spots`}
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={sidebarQuery}
                    onChange={(e) => setSidebarQuery(e.target.value)}
                    placeholder="Search locations or titles..."
                    className="h-8 pl-8 pr-7 text-xs"
                  />
                  {sidebarQuery && (
                    <button
                      onClick={() => setSidebarQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted/50"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                {sidebarFilteredPins.length === 0 && (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No spots match "{sidebarQuery}"
                  </p>
                )}
                {sidebarFilteredPins.map((pin, i) => (
                  <motion.div
                    key={`${pin.lat}-${pin.lng}-${i}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 20) * 0.03 }}
                    onClick={() => handleSearchResultClick(pin)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeBadgeClasses[pin.type]}`}>
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{pin.label}</p>
                      {isDisplayableTitle(pin.title) && (
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
              onClose={handleClosePanel}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
