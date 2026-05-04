import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Star, Bookmark, BookmarkCheck, Clock, Film, Tv, BookOpen,
  ArrowLeft, Camera, CheckCircle2, Loader2, Sparkles,
} from "lucide-react";
import { mockTitles, mockPosts } from "@/lib/mockData";
import { titleLocationPins } from "@/lib/mapData";
import LeafletMap from "@/components/LeafletMap";
import PostCard from "@/components/PostCard";
import CinemaCard from "@/components/CinemaCard";
import ShareMenu from "@/components/ShareMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSavedTitle } from "@/hooks/useSaved";
import { supabase } from "@/integrations/supabase/client";
import heroRomeImg from "@/assets/hero-rome.jpg";

const typeIcons = { Movie: Film, Series: Tv, Book: BookOpen };

function slugify(title: string, year: number) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}-${year}`;
}

type AILocation = { label: string; lat: number; lng: number; description?: string };
type AIDetails = {
  title: string;
  year: number;
  type: "Movie" | "Series" | "Book";
  rating: number;
  synopsis: string;
  creator?: string;
  genres: string[];
  locations: AILocation[];
};

export default function TitleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navState = useLocation().state as
    | { title?: string; year?: number; type?: string; creator?: string }
    | null;

  const mockTitle = useMemo(
    () => mockTitles.find((t) => slugify(t.title, t.year) === slug),
    [slug]
  );

  const [aiDetails, setAiDetails] = useState<AIDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mockTitle || !slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAiDetails(null);
    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("title-details", {
          body: { slug, title: navState?.title, year: navState?.year },
        });
        if (cancelled) return;
        if (fnError) {
          setError("Failed to load title details");
          return;
        }
        if (data?.error) {
          setError(data.error);
          return;
        }
        setAiDetails(data as AIDetails);
      } catch (e) {
        if (!cancelled) setError("Failed to load title details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, mockTitle, navState?.title, navState?.year]);

  // Build a unified view-model
  const view = useMemo(() => {
    if (mockTitle) {
      const titleSlug = slugify(mockTitle.title, mockTitle.year);
      const pins = titleLocationPins[titleSlug] || [];
      const locationItems = pins.length
        ? pins.map((p) => ({ label: p.label, lat: p.lat, lng: p.lng, description: undefined }))
        : mockTitle.locations.map((l) => ({ label: l, lat: 0, lng: 0, description: undefined }));
      return {
        source: "mock" as const,
        title: mockTitle.title,
        year: mockTitle.year,
        type: mockTitle.type,
        rating: mockTitle.rating,
        synopsis: undefined as string | undefined,
        creator: undefined as string | undefined,
        genres: mockTitle.genres,
        coverImage: mockTitle.coverImage,
        locations: locationItems,
        locationCount: mockTitle.locationCount,
      };
    }
    if (aiDetails) {
      return {
        source: "ai" as const,
        title: aiDetails.title,
        year: aiDetails.year,
        type: aiDetails.type,
        rating: aiDetails.rating,
        synopsis: aiDetails.synopsis,
        creator: aiDetails.creator,
        genres: aiDetails.genres || [],
        coverImage: heroRomeImg,
        locations: aiDetails.locations || [],
        locationCount: (aiDetails.locations || []).length,
      };
    }
    return null;
  }, [mockTitle, aiDetails]);

  // titleSlug and saved state must be computed before any conditional returns (Rules of Hooks)
  const titleSlug = view ? slugify(view.title, view.year) : "";
  const { saved, toggle: toggleSave, loading: saveLoading } = useSavedTitle(titleSlug);

  // Loading state
  if (!mockTitle && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-amber/30 text-amber text-xs mb-4">
            <Sparkles className="w-3.5 h-3.5" /> AI is mapping locations
          </div>
          <Loader2 className="w-8 h-8 text-amber animate-spin mx-auto mb-3" />
          <p className="font-serif text-xl text-foreground">Discovering filming locations…</p>
          <p className="text-muted-foreground text-sm mt-1">
            Gemini is gathering real-world spots for this title.
          </p>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="font-serif text-3xl text-foreground mb-2">Title not found</h1>
          {error && <p className="text-sm text-muted-foreground mb-3">{error}</p>}
          <Link to="/" className="text-amber text-sm hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  const TypeIcon = typeIcons[view.type];

  const validPins = view.locations.filter((l) => l.lat !== 0 || l.lng !== 0);
  const mapCenter: [number, number] = validPins.length
    ? [
        validPins.reduce((s, p) => s + p.lat, 0) / validPins.length,
        validPins.reduce((s, p) => s + p.lng, 0) / validPins.length,
      ]
    : [30, 10];
  const mapZoom = validPins.length ? (validPins.length === 1 ? 6 : 4) : 2;

  const mapPins = validPins.map((p) => ({
    label: p.label,
    lat: p.lat,
    lng: p.lng,
    type: view.type,
    title: view.title,
  }));

  const relatedTitles = mockTitles
    .filter((t) => slugify(t.title, t.year) !== titleSlug)
    .slice(0, 4);
  const communityPosts = mockPosts.slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Full-bleed Hero */}
      <div className="relative h-[55vh] min-h-[400px] w-full overflow-hidden">
        <img src={view.coverImage} alt={view.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />

        <Link
          to="/"
          className="absolute top-20 left-4 sm:left-8 z-10 glass rounded-xl p-2.5 border border-border text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {view.source === "ai" && (
          <div className="absolute top-20 right-4 sm:right-8 z-10 glass rounded-full px-3 py-1.5 border border-amber/30 text-amber text-[11px] font-mono flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> AI generated
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 badge-${view.type.toLowerCase()}`}>
                <TypeIcon className="w-3 h-3" />
                {view.type}
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl text-foreground mb-2 leading-tight">{view.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> {view.year}
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber" /> {view.rating?.toFixed(1)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal" /> {view.locationCount} locations
                </span>
                {view.creator && <span className="hidden sm:inline">· {view.creator}</span>}
              </div>

              {view.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {view.genres.map((g) => (
                    <span key={g} className="glass rounded-full px-3 py-1 text-xs text-foreground border border-border">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={toggleSave}
                  disabled={saveLoading}
                  className={`h-10 sm:h-11 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm transition-opacity flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 ${
                    saved
                      ? "glass border border-amber/40 text-amber hover:bg-muted/50"
                      : "bg-gradient-amber text-charcoal hover:opacity-90 shadow-amber"
                  }`}
                >
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span className="hidden xs:inline">{saved ? "Saved" : "Save to"}</span> {saved ? "" : "Map"}
                </button>
                <button className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl glass border border-border text-foreground font-medium text-xs sm:text-sm hover:bg-muted/50 transition-all flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-4 h-4" /> <span className="hidden xs:inline">I've</span> Been Here
                </button>
                <ShareMenu
                  title={view.title}
                  text={`Explore ${view.locationCount} filming locations from ${view.title} (${view.year})`}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">
        {view.synopsis && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-3">Synopsis</h2>
            <p className="text-muted-foreground leading-relaxed">{view.synopsis}</p>
          </section>
        )}

        {/* Filming Locations */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <MapPin className="w-5 h-5 text-amber" />
            <h2 className="font-serif text-2xl text-foreground">
              {view.type === "Book" ? "Locations in the Story" : "Filming Locations"}
            </h2>
            <span className="text-xs text-muted-foreground glass rounded-full px-2 py-0.5 border border-border">
              {view.locations.length} pinned
            </span>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <LeafletMap
                pins={mapPins}
                center={mapCenter}
                zoom={mapZoom}
                className="h-[420px] rounded-xl"
              />
            </div>

            <ScrollArea className="lg:w-80 h-[420px] glass rounded-xl border border-border">
              <div className="p-3 space-y-2">
                {view.locations.map((loc, i) => (
                  <motion.div
                    key={`${loc.label}-${i}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-lg p-3 border border-border flex items-start gap-3 cursor-pointer hover:border-amber/20 hover:bg-muted/30 transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center badge-${view.type.toLowerCase()}`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{loc.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {loc.lat !== 0 || loc.lng !== 0
                          ? `${loc.lat.toFixed(2)}°, ${loc.lng.toFixed(2)}°`
                          : "View on map →"}
                      </p>
                      {loc.description && (
                        <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{loc.description}</p>
                      )}
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
