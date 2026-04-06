import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, ChevronRight, Film, Tv, BookOpen, Navigation2, Camera,
  Lightbulb, Info, Clock, ArrowRight,
} from "lucide-react";
import LeafletMap from "@/components/LeafletMap";
import ShareMenu from "@/components/ShareMenu";
import type { MapPin as MapPinType } from "@/components/LeafletMap";
import { getSpotBySlug, getSpotsByCity } from "@/lib/filmingSpotsData";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const typeIcons: Record<string, React.ElementType> = {
  Movie: Film,
  Series: Tv,
  Book: BookOpen,
};

export default function FilmingSpotDetail() {
  const { slug } = useParams<{ slug: string }>();
  const spot = getSpotBySlug(slug || "");

  if (!spot) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center pt-20">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold mb-2">Spot Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find this filming location.</p>
          <Link to="/" className="text-amber hover:underline text-sm">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const Icon = typeIcons[spot.type] || Film;
  const citySpots = getSpotsByCity(spot.citySlug).filter((s) => s.slug !== spot.slug);

  const mainPin: MapPinType = {
    lat: spot.lat,
    lng: spot.lng,
    label: spot.name,
    title: spot.titles[0],
    type: spot.type,
  };

  const nearbyPins: MapPinType[] = citySpots.map((s) => ({
    lat: s.lat,
    lng: s.lng,
    label: s.name,
    title: s.titles[0],
    type: s.type,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground pt-20">
      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="text-muted-foreground hover:text-amber text-xs">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="w-3 h-3 text-muted-foreground" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/location/${spot.citySlug}`} className="text-muted-foreground hover:text-amber text-xs">
                  {spot.city}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="w-3 h-3 text-muted-foreground" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/location/${spot.citySlug}/filming-spots`} className="text-muted-foreground hover:text-amber text-xs">
                  Filming Spots
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="w-3 h-3 text-muted-foreground" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-amber text-xs font-medium">{spot.name}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{spot.flag}</span>
            <span className="glass rounded-full px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1.5">
              <Icon className="w-3 h-3" />
              {spot.type}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-2">{spot.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-amber" />
            <span>{spot.city}, {spot.country}</span>
            <span className="text-border">·</span>
            <span className="font-mono text-xs">{spot.lat.toFixed(4)}°N, {spot.lng.toFixed(4)}°E</span>
          </div>
          {spot.address && (
            <p className="text-xs text-muted-foreground mt-1">{spot.address}</p>
          )}
        </motion.div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Map + Description */}
          <div className="lg:col-span-3 space-y-6">
            {/* Map */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative rounded-2xl overflow-hidden h-[300px] lg:h-[400px]"
            >
              <LeafletMap
                pins={[mainPin, ...nearbyPins]}
                className="w-full h-full"
                zoom={15}
                center={[spot.lat, spot.lng]}
                highlightedPin={mainPin}
              />
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{ boxShadow: "inset 0 0 60px 20px hsl(0 0% 5% / 0.4)" }}
              />
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-lg font-bold text-foreground font-serif mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber" />
                About this Location
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{spot.description}</p>
            </motion.div>

            {/* Featured Titles */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-lg font-bold text-foreground font-serif mb-3 flex items-center gap-2">
                <Film className="w-4 h-4 text-amber" />
                Featured In
              </h2>
              <div className="flex flex-wrap gap-2">
                {spot.titles.map((t) => (
                  <span key={t} className="text-sm font-medium px-4 py-2 rounded-full bg-amber/10 text-amber">
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Fun Facts */}
            {spot.funFacts && spot.funFacts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="text-lg font-bold text-foreground font-serif mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber" />
                  Fun Facts
                </h2>
                <ul className="space-y-3">
                  {spot.funFacts.map((fact, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-amber/10 text-amber flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-2xl p-5 space-y-3"
            >
              <a
                href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-amber text-charcoal font-semibold text-sm hover:brightness-110 transition-all"
              >
                <Navigation2 className="w-4 h-4" />
                Open in Google Maps
              </a>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass text-foreground font-medium text-sm hover:border-amber/40 transition-all">
                <Camera className="w-4 h-4" />
                Upload a Photo
              </button>
            </motion.div>

            {/* Visit Tips */}
            {spot.visitTips && spot.visitTips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-5"
              >
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber" />
                  Visit Tips
                </h3>
                <ul className="space-y-2.5">
                  {spot.visitTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                      <span className="text-amber mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Nearby Spots */}
            {citySpots.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass rounded-2xl p-5"
              >
                <h3 className="text-sm font-bold text-foreground mb-3">
                  More Spots in {spot.city}
                </h3>
                <div className="space-y-1">
                  {citySpots.slice(0, 5).map((s) => (
                    <Link
                      key={s.slug}
                      to={`/location/${s.slug}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber/[0.05] transition-all group"
                    >
                      <div className="w-6 h-6 rounded-full glass flex items-center justify-center text-xs font-bold text-foreground">
                        {s.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{s.titles.join(", ")}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-amber transition-colors" />
                    </Link>
                  ))}
                </div>
                <Link
                  to={`/location/${spot.citySlug}/filming-spots`}
                  className="flex items-center justify-center gap-1.5 mt-3 text-xs text-amber hover:underline font-medium"
                >
                  View all spots in {spot.city}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
