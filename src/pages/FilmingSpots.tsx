import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Search, X, ArrowRight, ChevronRight, Film, Tv, BookOpen, Camera, Navigation2,
} from "lucide-react";
import LeafletMap from "@/components/LeafletMap";
import type { MapPin as MapPinType } from "@/components/LeafletMap";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { citiesFilmingData, type FilmingSpotData } from "@/lib/filmingSpotsData";

const typeIcons: Record<string, React.ElementType> = {
  Movie: Film,
  Series: Tv,
  Book: BookOpen,
};

export default function FilmingSpots() {
  const { slug } = useParams<{ slug: string }>();
  const city = citiesFilmingData[slug || ""] || citiesFilmingData.rome;

  const [spotSearch, setSpotSearch] = useState("");
  const [activeSpot, setActiveSpot] = useState<number | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<FilmingSpotData | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const filteredSpots = useMemo(() => {
    if (!spotSearch.trim()) return city.spots;
    const q = spotSearch.toLowerCase();
    return city.spots.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.titles.some((t) => t.toLowerCase().includes(q))
    );
  }, [spotSearch, city.spots]);

  const mapPins: MapPinType[] = useMemo(
    () =>
      city.spots.map((s) => ({
        lat: s.lat,
        lng: s.lng,
        label: s.name,
        title: s.titles[0],
        type: s.type,
      })),
    [city.spots]
  );

  const highlightedPin = useMemo(() => {
    if (activeSpot === null && !selectedSpot) return null;
    const spot = selectedSpot || city.spots.find((s) => s.id === activeSpot);
    if (!spot) return null;
    return { lat: spot.lat, lng: spot.lng, label: spot.name, type: spot.type } as MapPinType;
  }, [activeSpot, selectedSpot, city.spots]);

  function handleSpotClick(spot: FilmingSpotData) {
    setSelectedSpot(spot);
    setActiveSpot(spot.id);
    mapInstance?.flyTo([spot.lat, spot.lng], 16, { duration: 1.2 });
  }

  function handlePinClick(pin: MapPinType) {
    const spot = city.spots.find((s) => s.lat === pin.lat && s.lng === pin.lng);
    if (spot) {
      setSelectedSpot(spot);
      setActiveSpot(spot.id);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-20">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="text-muted-foreground hover:text-amber text-xs">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/location/${slug}`} className="text-muted-foreground hover:text-amber text-xs">
                  {city.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-amber text-xs font-medium">Filming Spots</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">{city.flag}</span>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
            Filming Spots in {city.name}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {city.spots.length} verified filming locations across {city.name}, {city.country}
        </p>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex flex-col lg:flex-row gap-6" style={{ minHeight: 650 }}>
          {/* Map */}
          <div className="lg:w-[60%] h-[350px] lg:h-auto relative rounded-2xl overflow-hidden">
            <LeafletMap
              pins={mapPins}
              className="w-full h-full min-h-[350px] lg:min-h-[650px]"
              zoom={13}
              center={city.coords}
              onPinClick={handlePinClick}
              onMapReady={setMapInstance}
              highlightedPin={highlightedPin}
              pathMode
              pathPins={mapPins}
            />
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{ boxShadow: "inset 0 0 60px 20px hsl(0 0% 5% / 0.4)" }}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:w-[40%] flex flex-col">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={spotSearch}
                onChange={(e) => setSpotSearch(e.target.value)}
                placeholder={`Search spots in ${city.name}...`}
                className="w-full h-10 pl-9 pr-9 rounded-xl glass text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-amber/50"
              />
              {spotSearch && (
                <button onClick={() => setSpotSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Spot list */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
              {filteredSpots.map((spot) => {
                const Icon = typeIcons[spot.type] || Film;
                const isActive = activeSpot === spot.id;

                return (
                  <motion.div
                    key={spot.id}
                    onClick={() => handleSpotClick(spot)}
                    onMouseEnter={() => setActiveSpot(spot.id)}
                    onMouseLeave={() => {
                      if (!selectedSpot || selectedSpot.id !== spot.id) setActiveSpot(null);
                    }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                      isActive
                        ? "bg-amber/[0.08] border-l-2 border-amber"
                        : "hover:bg-amber/[0.03] border-l-2 border-transparent"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive ? "bg-amber text-charcoal" : "glass text-foreground"
                      }`}
                    >
                      {spot.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{spot.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{spot.titles.join(", ")}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <Link to={`/spot/${spot.slug}`} onClick={(e) => e.stopPropagation()}>
                        <ArrowRight
                          className={`w-4 h-4 transition-all ${
                            isActive ? "text-amber translate-x-0.5" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                          }`}
                        />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}

              {filteredSpots.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No spots found matching "{spotSearch}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Spot Detail */}
        {selectedSpot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 glass rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-amber" />
                  <Link to={`/spot/${selectedSpot.slug}`} className="text-lg font-bold text-foreground hover:text-amber transition-colors">
                    {selectedSpot.name}
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedSpot.lat.toFixed(4)}°N, {selectedSpot.lng.toFixed(4)}°E
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedSpot(null);
                  setActiveSpot(null);
                }}
                className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedSpot.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {selectedSpot.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {selectedSpot.titles.map((t) => (
                <span key={t} className="text-xs font-medium px-3 py-1 rounded-full bg-amber/10 text-amber">
                  {t}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://www.google.com/maps?q=${selectedSpot.lat},${selectedSpot.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-amber hover:underline"
              >
                <Navigation2 className="w-3.5 h-3.5" />
                Open in Google Maps
              </a>
              <span className="text-border">·</span>
              <Link to={`/spot/${selectedSpot.slug}`} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                <Camera className="w-3.5 h-3.5" />
                View Details
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
