import { useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Star, Bookmark, Clock, Film, Tv, BookOpen, ArrowLeft, Camera, CheckCircle2 } from "lucide-react";
import { mockTitles, mockPosts } from "@/lib/mockData";
import { titleLocationPins, type EnrichedMapPin } from "@/lib/mapData";
import LeafletMap, { type MapPin as MapPinType } from "@/components/LeafletMap";
import PostCard from "@/components/PostCard";
import CinemaCard from "@/components/CinemaCard";
import ShareMenu from "@/components/ShareMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import L from "leaflet";

const typeIcons = { Movie: Film, Series: Tv, Book: BookOpen };

function slugify(title: string, year: number) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}-${year}`;
}

export default function TitleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const title = useMemo(
    () => mockTitles.find((t) => slugify(t.title, t.year) === slug),
    [slug]
  );

  if (!title) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-3xl text-foreground mb-2">Title not found</h1>
          <Link to="/" className="text-amber text-sm hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  const TypeIcon = typeIcons[title.type];
  const pins: EnrichedMapPin[] = titleLocationPins[slugify(title.title, title.year)] || [];
  const mapCenter: [number, number] = pins.length
    ? [pins.reduce((s, p) => s + p.lat, 0) / pins.length, pins.reduce((s, p) => s + p.lng, 0) / pins.length]
    : [30, 10];
  const mapZoom = pins.length ? 5 : 2;

  const relatedTitles = mockTitles.filter((t) => t.id !== title.id).slice(0, 4);
  const communityPosts = mockPosts.slice(0, 2);

  const highlightedPin = activeIndex !== null ? pins[activeIndex] : null;

  const handlePinClick = (pin: MapPinType) => {
    const idx = pins.findIndex((p) => p.lat === pin.lat && p.lng === pin.lng);
    if (idx !== -1) {
      setActiveIndex(idx);
      cardRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleCardClick = (pin: EnrichedMapPin, index: number) => {
    setActiveIndex(index);
    if (mapInstance) {
      mapInstance.flyTo([pin.lat, pin.lng], 14, { duration: 1.2 });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Split layout: map + sidebar */}
      <div className="flex flex-col md:flex-row" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Left: Full-height map */}
        <div className="relative w-full md:w-[65%] lg:w-[70%] h-[50vh] md:h-full">
          {/* Back button */}
          <Link
            to="/"
            className="absolute top-4 left-4 z-[1001] glass rounded-xl p-2.5 border border-border text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <LeafletMap
            pins={pins}
            center={mapCenter}
            zoom={mapZoom}
            className="h-full rounded-none border-0"
            onPinClick={handlePinClick}
            highlightedPin={highlightedPin}
            showCoordinates
            pathMode
            pathPins={pins}
            onMapReady={setMapInstance}
          />
        </div>

        {/* Right: Sidebar */}
        <div className="w-full md:w-[35%] lg:w-[30%] border-l border-border bg-background flex flex-col overflow-hidden">
          {/* Sidebar header */}
          <div className="p-5 border-b border-border shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold badge-${title.type.toLowerCase()}`}>
                <TypeIcon className="w-3 h-3" />
                {title.type}
              </div>
            </div>

            <h1 className="font-serif text-2xl md:text-3xl text-foreground leading-tight mb-1">{title.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {title.year}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber" /> {title.rating}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal" /> {pins.length} locations
              </span>
            </div>

            {/* Genre tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {title.genres.map((g) => (
                <span key={g} className="glass rounded-full px-2.5 py-0.5 text-[10px] text-foreground border border-border">
                  {g}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="h-9 px-4 rounded-xl bg-gradient-amber text-amber font-semibold text-xs hover:opacity-90 transition-opacity shadow-amber flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" /> Save
              </button>
              <button className="h-9 px-4 rounded-xl glass border border-border text-foreground font-medium text-xs hover:bg-muted/50 transition-all flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Visited
              </button>
              <ShareMenu
                title={title.title}
                text={`Explore filming locations from ${title.title} (${title.year})`}
              />
            </div>
          </div>

          {/* Location cards */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-amber" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Filming Locations</h2>
              </div>

              {pins.map((pin, i) => (
                <motion.div
                  key={i}
                  ref={(el) => { cardRefs.current[i] = el; }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => handleCardClick(pin, i)}
                  className={`glass rounded-xl border cursor-pointer transition-all overflow-hidden group ${
                    activeIndex === i
                      ? "border-amber/50 ring-1 ring-amber/30"
                      : "border-border hover:border-amber/20"
                  }`}
                >
                  {/* Thumbnail */}
                  {pin.image && (
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={pin.image}
                        alt={pin.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      {/* Documented badge */}
                      <div className="absolute top-2 right-2 bg-teal/90 text-foreground text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                        Documented
                      </div>
                    </div>
                  )}

                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif text-base text-foreground">{pin.label}</h3>
                    </div>
                    {pin.city && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {pin.city}
                      </span>
                    )}
                    {pin.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed italic">
                        "{pin.description}"
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">
                      {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Below-fold sections */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">
        {/* Community Photos */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <Camera className="w-5 h-5 text-teal" />
            <h2 className="font-serif text-2xl text-foreground">Community Photos</h2>
          </div>
          {communityPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {communityPosts.map((post, i) => (
                <PostCard key={post.id} post={post} delay={i * 0.08} />
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl border border-border p-10 text-center">
              <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No community photos yet. Be the first!</p>
            </div>
          )}
        </section>

        {/* Related Titles */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl text-foreground mb-5">You Might Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedTitles.map((t, i) => (
              <CinemaCard key={t.id} title={t} size="md" delay={i * 0.06} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
