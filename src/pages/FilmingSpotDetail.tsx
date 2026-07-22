import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, ChevronRight, Film, Tv, BookOpen, Navigation2, Camera,
  Lightbulb, Info, Clock, ArrowRight, Loader2, Sparkles, Bookmark, BookmarkCheck, CheckCircle2,
} from "lucide-react";
import ShareMenu from "@/components/ShareMenu";
import ReportInfoDialog from "@/components/ReportInfoDialog";
import PlanYourTripDialog from "@/components/PlanYourTripDialog";
import PassportBadgeUnlockSheet from "@/components/PassportBadgeUnlockSheet";
import { getSpotBySlug, getSpotsByCity } from "@/lib/filmingSpotsData";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { RevealButton } from "@/components/RevealDeck";
import { DEFAULT_PEXELS_IMAGE, fetchPexelsImage } from "@/lib/pexels";
import { useAllVisitedSpots, useBeenHereSpot, useSavedSpot } from "@/hooks/useSaved";
import {
  countryToCode,
  getBadgeTierForVisits,
  type PassportBadge,
} from "@/hooks/usePassportBadges";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const typeIcons: Record<string, React.ElementType> = {
  Movie: Film,
  Series: Tv,
  Book: BookOpen,
};

export default function FilmingSpotDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const spotSlug = slug || "";
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<PassportBadge | null>(null);
  const { saved: spotSaved, toggle: toggleSaveSpot, loading: saveSpotLoading } = useSavedSpot(spotSlug);
  const { spots: allVisitedSpots } = useAllVisitedSpots();
  const routeState = useLocation().state as {
    label?: string;
    lat?: number;
    lng?: number;
    titleHint?: string;
    type?: "Movie" | "Series" | "Book";
    description?: string;
  } | null;
  const staticSpot = useMemo(() => getSpotBySlug(slug || ""), [slug]);
  const [aiSpot, setAiSpot] = useState<{
    name: string;
    lat: number;
    lng: number;
    city: string;
    country: string;
    flag?: string;
    address?: string;
    description: string;
    type: "Movie" | "Series" | "Book";
    titles: string[];
    funFacts?: string[];
    visitTips?: string[];
    image?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || staticSpot) {
      setAiSpot(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // DB-first: hit Postgres directly when the spot is already enriched.
        const { data: row } = await supabase
          .from("spots")
          .select("name, address, city, country, flag, lat, lng, image_url, description, fun_facts, visit_tips, data")
          .eq("slug", slug)
          .maybeSingle();

        if (cancelled) return;

        if (row) {
          const base = (row.data && typeof row.data === "object") ? (row.data as Record<string, unknown>) : {};
          setAiSpot({
            ...(base as any),
            name: row.name,
            address: row.address,
            city: row.city,
            country: row.country,
            flag: row.flag,
            lat: row.lat,
            lng: row.lng,
            image: row.image_url,
            description: row.description,
            funFacts: row.fun_facts ?? [],
            visitTips: row.visit_tips ?? [],
          });
          setLoading(false);
          return;
        }

        const { invokeCached } = await import("@/lib/aiClientCache");
        const cacheKey = `${slug}|${routeState?.titleHint || ""}`;
        const data = await invokeCached<any>(
          "spot-details",
          {
            slug,
            label: routeState?.label,
            titleHint: routeState?.titleHint,
            lat: routeState?.lat,
            lng: routeState?.lng,
            type: routeState?.type,
          },
          cacheKey
        );

        if (cancelled) return;
        if (data?.error) {
          setError(data.error);
          return;
        }
        setAiSpot(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load location details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, staticSpot, routeState?.label, routeState?.titleHint, routeState?.lat, routeState?.lng, routeState?.type]);

  const spot = useMemo(() => {
    if (staticSpot) return staticSpot;
    if (!slug) return null;

    if (!aiSpot && routeState?.label) {
      const city = "Unknown City";
      const country = "Unknown Country";
      const normalizedType = routeState.type || "Movie";
      const titles = routeState?.titleHint ? [routeState.titleHint] : [];

      return {
        id: 0,
        slug,
        name: routeState.label,
        lat: routeState.lat ?? 0,
        lng: routeState.lng ?? 0,
        titles,
        description: routeState.description || "No description available yet.",
        type: normalizedType,
        city,
        citySlug: city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        country,
        flag: "📍",
        funFacts: [],
        visitTips: [],
      };
    }

    if (!aiSpot) return null;

    const city = aiSpot.city || "Unknown City";
    const normalizedType = aiSpot.type || routeState?.type || "Movie";
    const titles = aiSpot.titles?.length
      ? aiSpot.titles
      : routeState?.titleHint
        ? [routeState.titleHint]
        : [];

    return {
      id: 0,
      slug,
      name: aiSpot.name || routeState?.label || slug,
      lat: aiSpot.lat ?? routeState?.lat ?? 0,
      lng: aiSpot.lng ?? routeState?.lng ?? 0,
      titles,
      description: aiSpot.description || routeState?.description || "No description available yet.",
      type: normalizedType,
      city,
      citySlug: city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
      country: aiSpot.country || "Unknown Country",
      flag: aiSpot.flag || "📍",
      funFacts: aiSpot.funFacts || [],
      visitTips: aiSpot.visitTips || [],
      address: aiSpot.address,
      image: aiSpot.image,
    };
  }, [aiSpot, routeState?.description, routeState?.label, routeState?.lat, routeState?.lng, routeState?.titleHint, routeState?.type, slug, staticSpot]);

  const citySpots = staticSpot ? getSpotsByCity(staticSpot.citySlug).filter((s) => s.slug !== staticSpot.slug) : [];
  const { visited: beenHere, toggle: toggleBeenHere, loading: beenHereLoading } = useBeenHereSpot(
    spotSlug,
    spot
      ? {
          spotName: spot.name,
          lat: spot.lat,
          lng: spot.lng,
          city: spot.city,
          country: spot.country,
          type: spot.type,
        }
      : undefined
  );

  const handleToggleBeenHere = async () => {
    if (!spotSlug || !spot) return;

    const countryKey = spot.country.trim().toLowerCase();
    const existingCountryVisits = allVisitedSpots.filter(
      (visited) => visited.country.trim().toLowerCase() === countryKey
    );
    const isFirstCountryVisit = !beenHere && existingCountryVisits.length === 0;

    await toggleBeenHere();

    if (!isFirstCountryVisit) return;

    const nextVisitCount = existingCountryVisits.length + 1;
    const tier = getBadgeTierForVisits(nextVisitCount);
    const badge: PassportBadge = {
      id: `${countryToCode(spot.country)}-${countryKey.replace(/\s+/g, "-")}`,
      country: spot.country,
      countryCode: countryToCode(spot.country),
      tier,
      visitCount: nextVisitCount,
      earnedAt: new Date().toISOString(),
    };

    setUnlockedBadge(badge);
    setUnlockOpen(true);
  };

  if (!staticSpot && loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center pt-20 md:pt-24">
        <div className="text-center px-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-amber/30 text-amber text-xs mb-4">
            <Sparkles className="w-3.5 h-3.5" /> AI is loading this location
          </div>
          <Loader2 className="w-8 h-8 text-amber animate-spin mx-auto mb-3" />
          <h1 className="text-2xl font-serif font-bold mb-2">Fetching spot details</h1>
          <p className="text-muted-foreground text-sm">
            We’re gathering filming location details for this title.
          </p>
        </div>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center pt-20 md:pt-24">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold mb-2">Location details unavailable</h1>
          <p className="text-muted-foreground mb-2">
            {error || "We couldn't load this filming location right now."}
          </p>
          <p className="text-muted-foreground mb-6 text-sm">
            Try opening the spot again from the title page.
          </p>
          <Link to="/" className="text-amber hover:underline text-sm">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const Icon = typeIcons[spot.type] || Film;

  const firstTitle = spot.titles?.[0];
  const spotSeoTitle = firstTitle
    ? `${spot.name}, ${spot.city} — filming location from ${firstTitle}`
    : `${spot.name}, ${spot.city} — Filming Location`;
  const spotSeoDesc = (spot.description ||
    `Visit ${spot.name} in ${spot.city}, ${spot.country} — the real filming location from ${spot.titles.join(", ") || "screen and story"}. Coordinates, scene notes, and how to get there.`).slice(0, 160);
  const canonicalUrl = `https://sarevista.com/spot/${spot.slug}`;
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: spot.name,
    url: canonicalUrl,
    address: { "@type": "PostalAddress", addressLocality: spot.city, addressCountry: spot.country },
    geo: { "@type": "GeoCoordinates", latitude: spot.lat, longitude: spot.lng },
    description: spotSeoDesc,
    image: (spot as any).image,
    containedInPlace: { "@type": "Place", name: spot.city, address: { "@type": "PostalAddress", addressCountry: spot.country } },
    ...(spot.titles?.length
      ? {
          subjectOf: spot.titles.map((t: string) => ({ "@type": "CreativeWork", name: t })),
        }
      : {}),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://sarevista.com/" },
      { "@type": "ListItem", position: 2, name: spot.country, item: `https://sarevista.com/destinations?country=${encodeURIComponent(spot.country)}` },
      { "@type": "ListItem", position: 3, name: spot.city, item: `https://sarevista.com/location/${encodeURIComponent(spot.city.toLowerCase().replace(/\s+/g, "-"))}` },
      { "@type": "ListItem", position: 4, name: spot.name, item: canonicalUrl },
    ],
  };
  const spotSchema = [placeSchema, breadcrumbSchema];

  return (
    <div className="min-h-screen bg-background text-foreground pt-20 md:pt-24">
      <Seo title={spotSeoTitle} description={spotSeoDesc} type="article" image={(spot as any).image} jsonLd={spotSchema} canonicalPath={`/spot/${spot.slug}`} />
      <RevealButton
        context={{
          kind: "spot",
          slug: spot.slug,
          name: spot.name,
          meta: { city: spot.city, country: spot.country, title: spot.titles?.[0] },
        }}
      />
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
            {!staticSpot && (
              <span className="glass rounded-full px-2.5 py-1 text-[11px] font-medium text-amber border border-amber/30 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                AI generated
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-2">{spot.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-amber" />
            <span>{spot.city}, {spot.country}</span>
            <span className="text-border">·</span>
            <span className="font-mono text-xs">{spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}</span>
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
            {/* Hero image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative rounded-2xl overflow-hidden h-[300px] lg:h-[400px] isolate z-0 bg-muted"
            >
              {spot.image ? (
                <img
                  src={spot.image}
                  alt={spot.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                  onError={(e) => {
                    const t = e.currentTarget;
                    if (!t.dataset.fallback) {
                      t.dataset.fallback = "1";
                      void fetchPexelsImage(`${spot.name} ${spot.city}`).then((imageUrl) => {
                        t.src = imageUrl || DEFAULT_PEXELS_IMAGE;
                      });
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  <Camera className="w-6 h-6 mr-2 opacity-60" />
                  No image available
                </div>
              )}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{ boxShadow: "inset 0 0 80px 20px hsl(0 0% 5% / 0.55)" }}
              />
              <div className="absolute bottom-3 left-3 glass rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-amber" />
                {spot.city}, {spot.country}
              </div>
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
              <PlanYourTripDialog
                locationName={spot.city}
                spotName={spot.name}
                lat={spot.lat}
                lng={spot.lng}
                trigger={
                  <button className="relative overflow-hidden w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-amber text-charcoal font-semibold text-sm hover:brightness-110 transition-all shadow-amber">
                    <span className="relative z-10">Plan Your Trip 🗺️</span>
                    <div className="absolute inset-0 shimmer-sweep pointer-events-none" />
                  </button>
                }
              />
              <button
                onClick={toggleSaveSpot}
                disabled={saveSpotLoading || !spotSlug}
                className={`w-full h-11 px-4 rounded-xl font-bold text-sm transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 ${
                  spotSaved
                    ? "glass border border-amber/40 text-amber hover:bg-muted/50"
                    : "bg-gradient-amber text-charcoal hover:opacity-90 shadow-amber"
                }`}
              >
                {spotSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {spotSaved ? "Saved Spot" : "Save Spot"}
              </button>
              <button
                onClick={handleToggleBeenHere}
                disabled={beenHereLoading || !spotSlug}
                className={`w-full h-11 px-4 rounded-xl border font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                  beenHere
                    ? "bg-teal/15 border-teal/40 text-teal hover:bg-teal/20"
                    : "glass border-border text-foreground hover:bg-muted/50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {beenHere ? "Been Here" : "I've Been Here"}
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass text-foreground font-medium text-sm hover:border-amber/40 transition-all">
                <Camera className="w-4 h-4" />
                Upload a Photo
              </button>
              <ShareMenu
                title={spot.name}
                text={`Visit ${spot.name} in ${spot.city} — a real filming location from ${spot.titles.join(", ")}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass text-foreground font-medium text-sm hover:border-amber/40 transition-all"
              />
              <div className="flex justify-center pt-1">
                <ReportInfoDialog entityType="spot" slug={spotSlug} />
              </div>
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

      <PassportBadgeUnlockSheet
        open={unlockOpen}
        badge={unlockedBadge}
        onClose={() => setUnlockOpen(false)}
        onViewPassport={() => {
          setUnlockOpen(false);
          navigate("/profile");
        }}
      />
    </div>
  );
}
