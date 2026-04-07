import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Star, Bookmark, BookmarkCheck, Clock, Film, Tv, BookOpen, ArrowLeft, Camera, CheckCircle2 } from "lucide-react";
import { mockTitles, mockPosts } from "@/lib/mockData";
import { titleLocationPins } from "@/lib/mapData";
import LeafletMap from "@/components/LeafletMap";
import PostCard from "@/components/PostCard";
import CinemaCard from "@/components/CinemaCard";
import ShareMenu from "@/components/ShareMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSavedTitle } from "@/hooks/useSaved";

const typeIcons = { Movie: Film, Series: Tv, Book: BookOpen };

function slugify(title: string, year: number) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}-${year}`;
}

export default function TitleDetail() {
  const { slug } = useParams<{ slug: string }>();

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
  const pins = titleLocationPins[slugify(title.title, title.year)] || [];
  const locationItems = pins.length
    ? pins
    : title.locations.map((l) => ({ label: l, lat: 0, lng: 0, type: title.type, title: title.title }));
  const mapCenter: [number, number] = pins.length
    ? [pins.reduce((s, p) => s + p.lat, 0) / pins.length, pins.reduce((s, p) => s + p.lng, 0) / pins.length]
    : [30, 10];
  const mapZoom = pins.length ? 5 : 2;

  const relatedTitles = mockTitles.filter((t) => t.id !== title.id).slice(0, 4);
  const communityPosts = mockPosts.slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Full-bleed Hero */}
      <div className="relative h-[55vh] min-h-[400px] w-full overflow-hidden">
        <img src={title.coverImage} alt={title.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />

        {/* Back button */}
        <Link
          to="/"
          className="absolute top-20 left-4 sm:left-8 z-10 glass rounded-xl p-2.5 border border-border text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {/* Type badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 badge-${title.type.toLowerCase()}`}>
                <TypeIcon className="w-3 h-3" />
                {title.type}
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl text-foreground mb-2 leading-tight">{title.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> {title.year}
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber" /> {title.rating}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal" /> {title.locationCount} locations
                </span>
              </div>

              {/* Genre tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {title.genres.map((g) => (
                  <span key={g} className="glass rounded-full px-3 py-1 text-xs text-foreground border border-border">
                    {g}
                  </span>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl bg-gradient-amber text-charcoal font-bold text-xs sm:text-sm hover:opacity-90 transition-opacity shadow-amber flex items-center gap-1.5 sm:gap-2">
                  <Bookmark className="w-4 h-4" /> <span className="hidden xs:inline">Save to</span> Map
                </button>
                <button className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl glass border border-border text-foreground font-medium text-xs sm:text-sm hover:bg-muted/50 transition-all flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-4 h-4" /> <span className="hidden xs:inline">I've</span> Been Here
                </button>
                <ShareMenu
                  title={title.title}
                  text={`Explore ${title.locationCount} filming locations from ${title.title} (${title.year})`}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">
        {/* Filming Locations Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <MapPin className="w-5 h-5 text-amber" />
            <h2 className="font-serif text-2xl text-foreground">Filming Locations</h2>
            <span className="text-xs text-muted-foreground glass rounded-full px-2 py-0.5 border border-border">
              {locationItems.length} pinned
            </span>
          </div>

          {/* Map + Location List Side by Side */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Interactive Map */}
            <div className="flex-1 min-w-0">
              <LeafletMap pins={locationItems} center={mapCenter} zoom={mapZoom} className="h-[420px] rounded-xl" />
            </div>

            {/* Scrollable Location List */}
            <ScrollArea className="lg:w-80 h-[420px] glass rounded-xl border border-border">
              <div className="p-3 space-y-2">
                {locationItems.map((loc, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-lg p-3 border border-border flex items-center gap-3 cursor-pointer hover:border-amber/20 hover:bg-muted/30 transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center badge-${title.type.toLowerCase()}`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{loc.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {loc.lat !== 0 ? `${loc.lat.toFixed(2)}°, ${loc.lng.toFixed(2)}°` : "View on map →"}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </section>

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
