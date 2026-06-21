import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Star, Bookmark, BookmarkCheck, Clock, Film, Tv, BookOpen,
  ArrowLeft, Camera, CheckCircle2, Loader2, Sparkles, Route,
} from "lucide-react";
import { mockTitles, mockPosts } from "@/lib/mockData";
import { titleLocationPins } from "@/lib/mapData";
import LeafletMap, { type AppMap, type MapPin as LeafletMapPin } from "@/components/LeafletMap";
import SpotActionsModal from "@/components/SpotActionsModal";
import PostCard from "@/components/PostCard";
import ShareMenu from "@/components/ShareMenu";
import ReportInfoDialog from "@/components/ReportInfoDialog";
import AddLocationDialog from "@/components/AddLocationDialog";
import FilmingTrailDialog from "@/components/FilmingTrailDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useSavedTitle, useWatchedTitle } from "@/hooks/useSaved";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { RevealButton } from "@/components/RevealDeck";
import heroRomeImg from "@/assets/hero-rome.jpg";

const typeIcons = { Movie: Film, Series: Tv, Book: BookOpen };

const imdbGenreIconMap: Record<string, string> = {
  action: "💥",
  adventure: "🤠",
  animation: "🎨",
  biography: "📜",
  comedy: "😂",
  crime: "🕵️‍♂️",
  drama: "🎭",
  family: "👨‍👩‍👧‍👦",
  fantasy: "🧝‍♂️",
  filmnoir: "🚬",
  history: "⏳",
  horror: "😱",
  music: "🎶",
  musical: "💃",
  mystery: "🔮",
  romance: "💕",
  scifi: "🚀",
  sport: "🏅",
  thriller: "🫣",
  war: "🪖",
  western: "🌵",
  adult: "🔞",
  documentary: "📹",
  gameshow: "🎲",
  news: "📰",
  realitytv: "📺",
  short: "⏱️",
  talkshow: "🎙️",
};

function normalizeGenreLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getGenreIcon(label: string) {
  return imdbGenreIconMap[normalizeGenreLabel(label)] || "🎬";
}

function slugify(title: string, year: number) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}-${year}`;
}

type AILocation = { label: string; lat: number; lng: number; description?: string };
type AIDetails = {
  title: string;
  year: number;
  type: "Movie" | "Series" | "Book";
  rating?: number;
  synopsis?: string;
  creator?: string;
  genres?: string[];
  locations?: AILocation[];
  coverImage?: string;
};

type StreamEventName = "meta" | "details" | "complete" | "error";

function resolveTitleType(type?: string): "Movie" | "Series" | "Book" {
  if (type === "Series" || type === "Book") return type;
  return "Movie";
}

function applyTitlePatch(
  patch: Partial<AIDetails>,
  previous: AIDetails | null,
  fallback: { title?: string; year?: number; type?: string }
): AIDetails {
  const baseTitle = patch.title || previous?.title || fallback.title || "Untitled";
  const baseYear = Number(patch.year ?? previous?.year ?? fallback.year ?? 0) || new Date().getFullYear();
  const baseType = resolveTitleType(String(patch.type ?? previous?.type ?? fallback.type ?? "Movie"));

  return {
    title: baseTitle,
    year: baseYear,
    type: baseType,
    rating: patch.rating ?? previous?.rating,
    synopsis: patch.synopsis ?? previous?.synopsis,
    creator: patch.creator ?? previous?.creator,
    genres: patch.genres ?? previous?.genres ?? [],
    locations: patch.locations ?? previous?.locations ?? [],
    coverImage: patch.coverImage ?? previous?.coverImage,
  };
}

function slugifySpot(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function hasLocationCoords(location: AILocation) {
  return Number.isFinite(location.lat) && Number.isFinite(location.lng) && (location.lat !== 0 || location.lng !== 0);
}

function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAP_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
}

function buildGoogleMapsEmbedUrl(label: string, lat: number, lng: number) {
  const apiKey = getGoogleMapsApiKey();
  if (apiKey) {
    const query = encodeURIComponent(`${label}@${lat},${lng}`);
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&zoom=16`;
  }

  return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed&t=k`;
}

function buildGoogleMapsDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function buildGoogleStreetViewEmbedUrl(lat: number, lng: number, heading = 180, pitch = 0, fov = 90) {
  const apiKey = getGoogleMapsApiKey();
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}`;
  }

  return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed&t=k`;
}

function shouldPreferMapFallback(label: string, lat: number, lng: number) {
  const normalized = label.toLowerCase();
  const restrictedKeyword = /(forensic|mental health|pentagon|military|air force|naval|embassy|prison|detention|restricted)/.test(normalized);
  const terrainKeyword = /(mount|\bmt\b|mountain|range|river|lake|park|rocks?|burn|cone|valley|gully|fields?|wilderness|trail|forest|reserve|national park|alps?|remarkables)/.test(normalized);
  if (restrictedKeyword || terrainKeyword) return true;

  const knownProblemLocations: Array<[number, number]> = [
    [42.7483, -81.1606], // Southwest Centre for Forensic Mental Health Care, St. Thomas
  ];

  return knownProblemLocations.some(([knownLat, knownLng]) =>
    Math.abs(lat - knownLat) < 0.002 && Math.abs(lng - knownLng) < 0.002
  );
}

export default function TitleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const navState = useLocation().state as
    | { title?: string; year?: number; type?: string; creator?: string; locationCount?: number }
    | null;

  const mockTitle = useMemo(
    () => mockTitles.find((t) => slugify(t.title, t.year) === slug),
    [slug]
  );

  const [aiDetails, setAiDetails] = useState<AIDetails | null>(null);
  const [loading, setLoading] = useState(!mockTitle);
  const [streamStage, setStreamStage] = useState<"idle" | "ai_started" | "details" | "complete">("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedLocationPin, setSelectedLocationPin] = useState<LeafletMapPin | null>(null);
  const [titleMap, setTitleMap] = useState<AppMap | null>(null);
  const [userLocations, setUserLocations] = useState<AILocation[]>([]);
  const [relatedTitlesData, setRelatedTitlesData] = useState<any[] | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const [trailOpen, setTrailOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [slug]);

  const openRelatedTitle = (t: any) => {
    navigate(`/title/${slugify(t.title, t.year)}`, {
      state: {
        title: t.title,
        year: t.year,
        type: t.type,
        locationCount: t.locationCount ?? t.spots,
      },
    });
  };

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("location_suggestions")
        .select("verified_label, verified_lat, verified_lng, ai_notes")
        .eq("title_slug", slug)
        .eq("status", "verified");
      if (cancelled || !data) return;
      setUserLocations(
        data
          .filter((r) => r.verified_lat != null && r.verified_lng != null)
          .map((r) => ({
            label: r.verified_label as string,
            lat: r.verified_lat as number,
            lng: r.verified_lng as number,
            description: (r.ai_notes as string | null) || undefined,
          }))
      );
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (mockTitle || !slug) return;
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setStreamStage("idle");
    setError(null);
    setAiDetails(null);
    (async () => {
      try {
        // DB-first: if already enriched, render instantly (no edge cold start).
        const { data: row } = await supabase
          .from("titles")
          .select("title, year, type, synopsis, genres, rating, poster_url, backdrop_url, data")
          .eq("slug", slug)
          .maybeSingle();

        if (cancelled) return;

        if (row) {
          const base = (row.data && typeof row.data === "object") ? (row.data as Record<string, unknown>) : {};
          const hydrated = {
            ...base,
            title: row.title,
            year: row.year ?? undefined,
            type: row.type as "Movie" | "Series" | "Book",
            synopsis: row.synopsis ?? undefined,
            genres: row.genres ?? [],
            rating: row.rating ?? undefined,
            coverImage: row.poster_url ?? undefined,
            backdropImage: row.backdrop_url ?? undefined,
          } as Partial<AIDetails>;
          setAiDetails((prev) => applyTitlePatch(hydrated, prev, navState || {}));
          setStreamStage("complete");
          setLoading(false);
          return;
        }

        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/title-details`;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(functionUrl, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ slug, title: navState?.title, year: navState?.year, creator: navState?.creator, type: navState?.type }),
        });

        if (!response.ok) {
          const fallback = await response.json().catch(() => null);
          throw new Error(fallback?.error || "Failed to load title details");
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/event-stream")) {
          const data = await response.json().catch(() => null);
          if (!data?.error) {
            setAiDetails((prev) => applyTitlePatch(data || {}, prev, navState || {}));
            setStreamStage("complete");
            setLoading(false);
            return;
          }
          throw new Error(data?.error || "Failed to load title details");
        }

        if (!response.body) {
          throw new Error("Streaming unavailable");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processEvent = (raw: string) => {
          const lines = raw.split("\n").filter(Boolean);
          let eventName: StreamEventName | "message" = "message";
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim() as StreamEventName;
            if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
          }

          if (!dataLines.length) return;
          let payload: any = null;
          try {
            payload = JSON.parse(dataLines.join("\n"));
          } catch {
            return;
          }

          if (cancelled) return;
          if (eventName === "meta") {
            setStreamStage("ai_started");
            setAiDetails((prev) => applyTitlePatch(payload, prev, navState || {}));
            return;
          }
          if (eventName === "details") {
            setStreamStage("details");
            setAiDetails((prev) => applyTitlePatch(payload, prev, navState || {}));
            return;
          }
          if (eventName === "complete") {
            setStreamStage("complete");
            setAiDetails((prev) => applyTitlePatch(payload, prev, navState || {}));
            setLoading(false);
            return;
          }
          if (eventName === "error") {
            setError(payload?.error || "Failed to load title details");
            setLoading(false);
          }
        };

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split(/\r?\n\r?\n/);
          buffer = chunks.pop() || "";
          for (const chunk of chunks) processEvent(chunk);
        }

        // Some runtimes leave the final SSE frame in the buffer without a trailing delimiter.
        if (!cancelled && buffer.trim()) {
          processEvent(buffer);
        }

        if (!cancelled && loading) {
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled && !(e instanceof DOMException && e.name === "AbortError")) {
          setError(e instanceof Error ? e.message : "Failed to load title details");
          setLoading(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, mockTitle, navState?.title, navState?.year, navState?.creator, navState?.type]);

  // Build a unified view-model
  const view = useMemo(() => {
    const extra = userLocations;
    if (mockTitle) {
      const titleSlug = slugify(mockTitle.title, mockTitle.year);
      const pins = titleLocationPins[titleSlug] || [];
      const locationItems = pins.length
        ? pins.map((p) => ({ label: p.label, lat: p.lat, lng: p.lng, description: undefined as string | undefined }))
        : mockTitle.locations.map((l) => ({ label: l, lat: 0, lng: 0, description: undefined as string | undefined }));
      const merged = [...locationItems, ...extra];
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
        locations: merged,
        locationCount: merged.length,
      };
    }
    if (aiDetails) {
      const merged = [...(aiDetails.locations || []), ...extra];
      return {
        source: "ai" as const,
        title: aiDetails.title,
        year: aiDetails.year,
        type: aiDetails.type,
        rating: aiDetails.rating,
        synopsis: aiDetails.synopsis,
        creator: aiDetails.creator,
        genres: aiDetails.genres || [],
        coverImage: aiDetails.coverImage || heroRomeImg,
        locations: merged,
        locationCount: merged.length,
      };
    }

    if (navState?.title && navState?.year) {
      const merged = [...extra];
      return {
        source: "ai" as const,
        title: navState.title,
        year: Number(navState.year),
        type: resolveTitleType(navState.type),
        rating: 0,
        synopsis: undefined as string | undefined,
        creator: navState.creator,
        genres: [] as string[],
        coverImage: heroRomeImg,
        locations: merged,
        locationCount: merged.length,
      };
    }

    return null;
  }, [mockTitle, aiDetails, userLocations, navState]);

  const relatedSeed = useMemo(() => {
    if (view) return { title: view.title, year: view.year, type: view.type };
    if (navState?.title && navState?.year) {
      return {
        title: navState.title,
        year: Number(navState.year),
        type: resolveTitleType(navState.type),
      };
    }
    return null;
  }, [view, navState]);

  // Fetch related titles from TMDB
  useEffect(() => {
    if (!relatedSeed) return;
    let cancelled = false;
    setRelatedLoading(true);
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("related-titles", {
          body: { title: relatedSeed.title, year: relatedSeed.year, type: relatedSeed.type },
        });
        if (cancelled) return;
        const titles = Array.isArray(data?.titles) ? data.titles : [];
        setRelatedTitlesData(titles);
      } catch {
        if (!cancelled) setRelatedTitlesData([]);
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [relatedSeed]);

  // titleSlug and saved state must be computed before any conditional returns (Rules of Hooks)
  const titleSlug = view ? slugify(view.title, view.year) : "";
  const { saved, toggle: toggleSave, loading: saveLoading } = useSavedTitle(titleSlug);
  const { watched, toggle: toggleWatched, loading: watchedLoading } = useWatchedTitle(titleSlug);

  const validPins = view ? view.locations.filter((l) => l.lat !== 0 || l.lng !== 0) : [];
  const mapCenter: [number, number] = validPins.length
    ? [
        validPins.reduce((s, p) => s + p.lat, 0) / validPins.length,
        validPins.reduce((s, p) => s + p.lng, 0) / validPins.length,
      ]
    : [30, 10];
  const mapZoom = validPins.length ? (validPins.length === 1 ? 6 : 4) : 2;

  const mapPins: LeafletMapPin[] = view
    ? validPins.map((p) => ({
        label: p.label,
        lat: p.lat,
        lng: p.lng,
        type: view.type,
        title: view.title,
      }))
    : [];

  const displayLocationCount = mapPins.length;

  useEffect(() => {
    if (!view?.locations.length) return;
    const firstPinnedIndex = view.locations.findIndex(hasLocationCoords);
    setActiveLocationIndex(firstPinnedIndex >= 0 ? firstPinnedIndex : 0);
  }, [view]);

  const activeLocation = useMemo(() => {
    if (!view?.locations.length) return null;
    const direct = view.locations[activeLocationIndex] || null;
    if (direct && hasLocationCoords(direct)) return direct;
    return view.locations.find(hasLocationCoords) || direct;
  }, [view, activeLocationIndex]);

  const renderLocationCard = (loc: AILocation, i: number, showMap: boolean) => {
    const hasCoords = hasLocationCoords(loc);
    const useStreetView = hasCoords ? !shouldPreferMapFallback(loc.label, loc.lat, loc.lng) : false;
    const embedUrl = hasCoords
      ? useStreetView
        ? buildGoogleStreetViewEmbedUrl(loc.lat, loc.lng)
        : buildGoogleMapsEmbedUrl(loc.label, loc.lat, loc.lng)
      : "";

    return (
      <motion.div
        key={`${loc.label}-${i}`}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.04 }}
        onClick={() => {
          setSelectedLocationPin({
            label: loc.label,
            lat: loc.lat,
            lng: loc.lng,
            title: view?.title,
            type: view?.type || "Movie",
            city: loc.label,
          });
          setActiveLocationIndex(i);
        }}
        className={`rounded-lg border border-border overflow-hidden cursor-pointer hover:border-amber/20 hover:bg-muted/30 transition-all ${
          activeLocationIndex === i ? "ring-1 ring-amber/20" : ""
        }`}
      >
        {showMap && hasCoords ? (
          <div className="block relative">
            <iframe
              src={embedUrl}
              width="100%"
              height="180"
              style={{ border: 0, borderRadius: "12px 12px 0 0" }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title={`${loc.label} on Google Maps`}
            />
            <a
              href={buildGoogleMapsDirectionsUrl(loc.lat, loc.lng)}
              target="_blank"
              rel="noreferrer"
              className="absolute right-2 top-2 z-20 glass rounded-md px-2 py-1 text-[11px] font-medium text-foreground border border-border hover:bg-muted/70 transition-colors"
              aria-label={`Open directions for ${loc.label} in Google Maps`}
            >
              Directions
            </a>
          </div>
        ) : null}

        <div className={`p-3 flex items-start gap-3 ${showMap && hasCoords ? "rounded-b-lg" : ""}`}>
          <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center badge-${view?.type.toLowerCase() || "movie"}`}>
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{loc.label}</p>
            <p className="text-xs text-muted-foreground">
              {hasCoords ? `${loc.lat.toFixed(2)}°, ${loc.lng.toFixed(2)}°` : "View on map →"}
            </p>
            {loc.description && <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{loc.description}</p>}
          </div>
        </div>
      </motion.div>
    );
  };

  const isInitialLoading = loading && !mockTitle && !aiDetails;
  const loadingProgress = useMemo(() => {
    if (!loading) return 100;
    if (streamStage === "details") return 88;
    if (streamStage === "ai_started") return 58;
    return 24;
  }, [loading, streamStage]);

  const loadingMessage =
    streamStage === "details"
      ? "Finalizing title media..."
      : streamStage === "ai_started"
      ? "Mapping locations..."
      : "Preparing title details...";

  useEffect(() => {
    if (!titleMap || !mapPins.length) return;

    const focusMapOnPins = () => {
      if (mapPins.length === 1) {
        const pin = mapPins[0];
        titleMap.flyTo({
          center: [pin.lng, pin.lat],
          zoom: 9,
          duration: 500,
          essential: true,
        });
        return;
      }

      const lats = mapPins.map((p) => p.lat);
      const lngs = mapPins.map((p) => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      titleMap.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: 64,
          duration: 500,
          maxZoom: 9,
          essential: true,
        }
      );
    };

    if (titleMap.isStyleLoaded()) {
      focusMapOnPins();
    } else {
      titleMap.once("load", focusMapOnPins);
    }
  }, [titleMap, mapPins]);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-amber/30 text-amber text-xs mb-4">
            <Sparkles className="w-3.5 h-3.5" /> {loadingMessage}
          </div>
          <Loader2 className="w-8 h-8 text-amber animate-spin mx-auto mb-3" />
          <p className="font-serif text-xl text-foreground">Discovering filming locations...</p>
        </div>
      </div>
    );
  }

  if (!view) {
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="glass rounded-2xl px-6 py-5 flex items-center gap-3 text-foreground">
            <Loader2 className="w-5 h-5 text-amber animate-spin" />
            <span className="text-sm font-medium">Loading title details...</span>
          </div>
        </div>
      );
    }

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

  const fallbackRelated = mockTitles
    .filter((t) => slugify(t.title, t.year) !== titleSlug)
    .slice(0, 4);
  const relatedTitles = (relatedTitlesData && relatedTitlesData.length > 0
    ? relatedTitlesData
    : fallbackRelated
  ).slice(0, 8);
  const communityPosts = mockPosts.slice(0, 2);

  const seoTitle = `${view.title} (${view.year}) Filming Locations`;
  const seoDesc = (view.synopsis ||
    `Discover real filming locations from ${view.title} (${view.year}). Map the places that brought this ${view.type.toLowerCase()} to life.`).slice(0, 160);
  const movieSchema = {
    "@context": "https://schema.org",
    "@type": view.type === "Series" ? "TVSeries" : view.type === "Book" ? "Book" : "Movie",
    name: view.title,
    datePublished: String(view.year),
    image: view.coverImage,
    description: seoDesc,
    aggregateRating: view.rating
      ? { "@type": "AggregateRating", ratingValue: view.rating, bestRating: 10, ratingCount: 1 }
      : undefined,
    genre: view.genres,
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Seo title={seoTitle} description={seoDesc} type="article" image={view.coverImage} jsonLd={movieSchema} />
      {slug && (
        <RevealButton
          context={{
            kind: "title",
            slug,
            name: view.title,
            meta: { year: view.year, type: view.type },
          }}
        />
      )}
      {/* Hero */}
      <div className="relative h-[55vh] min-h-[400px] w-full overflow-hidden lg:mx-auto lg:mt-6 lg:max-w-5xl lg:h-[55vh] lg:min-h-[400px] lg:rounded-3xl lg:border lg:border-border lg:shadow-card">
          <img
            src={view.coverImage}
            alt={view.title}
            className="absolute inset-0 h-full w-full object-cover object-center lg:object-[center_22%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-overlay/55 via-overlay/15 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-overlay/25 via-transparent to-transparent" />

          <Link
            to="/"
            className="absolute top-4 left-4 z-10 glass rounded-xl p-2.5 border border-border text-overlay-foreground hover:bg-muted/50 transition-colors lg:left-auto lg:right-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:px-8 lg:pb-8 lg:pt-0 text-overlay-foreground">
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
                  <Star className="w-4 h-4 text-amber" /> {view.rating ? view.rating.toFixed(1) : "-"}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal" /> {displayLocationCount} locations
                </span>
                {view.creator && <span className="hidden sm:inline">· {view.creator}</span>}
              </div>

              {!mockTitle && loading && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-amber/30 text-amber text-xs mb-4">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {streamStage === "details" ? "Finalizing title media" : "Mapping locations"}
                </div>
              )}

              {view.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {view.genres.map((g) => (
                    <span
                      key={g}
                      className="glass rounded-full px-3 py-1 text-xs text-foreground border border-border inline-flex items-center gap-1.5"
                      title={g}
                      aria-label={g}
                    >
                      <span className="sm:hidden" aria-hidden="true">{getGenreIcon(g)}</span>
                      <span className="hidden sm:inline">{g}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={toggleSave}
                  disabled={saveLoading}
                  className={`h-11 px-5 sm:px-6 rounded-full font-bold text-sm transition-opacity flex items-center gap-2 disabled:opacity-50 ${
                    saved
                      ? "glass border border-amber/40 text-amber hover:bg-muted/50"
                      : "bg-gradient-amber text-charcoal hover:opacity-90 shadow-amber"
                  }`}
                >
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span>{saved ? "Saved" : "Save to Map"}</span>
                </button>

                <div className="flex sm:hidden items-center gap-2">
                  <button
                    onClick={toggleWatched}
                    disabled={watchedLoading}
                    aria-label={watched ? "Watched" : "Mark as watched"}
                    className={`h-11 w-11 rounded-full glass border transition-all flex items-center justify-center disabled:opacity-50 ${
                      watched
                        ? "border-teal/40 text-teal bg-teal/10"
                        : "border-border text-foreground hover:bg-muted/50 hover:text-amber"
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${watched ? "fill-teal/20" : ""}`} />
                  </button>
                  <AddLocationDialog titleSlug={titleSlug} titleName={view.title} iconOnly />
                  <ShareMenu
                    title={view.title}
                    text={`Explore ${displayLocationCount} filming locations from ${view.title} (${view.year})`}
                    iconOnly
                  />
                </div>

                <div className="hidden sm:flex items-center gap-3">
                  <button
                    onClick={toggleWatched}
                    disabled={watchedLoading}
                    className={`h-11 px-6 rounded-full glass border font-medium text-sm transition-all flex items-center gap-2 disabled:opacity-50 ${
                      watched
                        ? "border-teal/40 text-teal bg-teal/10 hover:bg-teal/15"
                        : "border-border text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${watched ? "fill-teal/20" : ""}`} />
                    {watched ? "Watched" : "Mark Watched"}
                  </button>
                  <AddLocationDialog titleSlug={titleSlug} titleName={view.title} />
                  <ShareMenu
                    title={view.title}
                    text={`Explore ${displayLocationCount} filming locations from ${view.title} (${view.year})`}
                  />
                </div>
              </div>
              <div className="mt-2">
                <ReportInfoDialog entityType="title" slug={titleSlug} />
              </div>
            </motion.div>
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
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <MapPin className="w-5 h-5 text-amber" />
            <h2 className="font-serif text-2xl text-foreground">
              {view.type === "Book" ? "Locations in the Story" : "Filming Locations"}
            </h2>
            <span className="text-xs text-muted-foreground glass rounded-full px-2 py-0.5 border border-border">
              {view.locations.length} pinned
            </span>
            {validPins.length >= 2 && (
              <button
                onClick={() => setTrailOpen(true)}
                className="ml-auto inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-gradient-amber text-charcoal font-bold text-xs shadow-amber hover:opacity-90 transition-opacity"
              >
                <Route className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Build Filming Trail</span>
                <span className="sm:hidden">Build Trail</span>
              </button>
            )}
          </div>

          <div className="lg:hidden space-y-2">
            {view.locations.map((loc, i) => renderLocationCard(loc, i, true))}
          </div>

          <div className="hidden lg:flex gap-4 items-start">
            <ScrollArea className="w-2/5 h-[70vh] max-h-[720px] glass rounded-xl border border-border">
              <div className="p-3 space-y-2">
                {view.locations.map((loc, i) => renderLocationCard(loc, i, false))}
              </div>
            </ScrollArea>

            <div className="w-3/5 sticky top-8 self-start">
              <div className="glass rounded-xl border border-border overflow-hidden h-[70vh] max-h-[720px] relative">
                {activeLocation && hasLocationCoords(activeLocation) ? (
                  <>
                    {(() => {
                      const useStreetView = !shouldPreferMapFallback(
                        activeLocation.label,
                        activeLocation.lat,
                        activeLocation.lng
                      );
                      const activeEmbedUrl = useStreetView
                        ? buildGoogleStreetViewEmbedUrl(activeLocation.lat, activeLocation.lng)
                        : buildGoogleMapsEmbedUrl(activeLocation.label, activeLocation.lat, activeLocation.lng);

                      return (
                        <>
                    <iframe
                      key={`${activeLocation.lat}-${activeLocation.lng}`}
                      src={activeEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`${activeLocation.label} on Google Maps`}
                      className="absolute inset-0 h-full w-full"
                    />
                    <a
                      href={buildGoogleMapsDirectionsUrl(activeLocation.lat, activeLocation.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute right-4 top-4 z-20 glass rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
                      aria-label={`Open directions for ${activeLocation.label} in Google Maps`}
                    >
                      Directions
                    </a>
                    <div className="absolute left-4 top-4 z-20 glass rounded-xl border border-border px-3 py-2 max-w-[80%]">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active location</p>
                      <p className="text-sm font-semibold text-foreground truncate">{activeLocation.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {activeLocation.lat.toFixed(2)}°, {activeLocation.lng.toFixed(2)}°
                      </p>
                      {!useStreetView && (
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-1">Map fallback</p>
                      )}
                    </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center p-6 text-center text-muted-foreground">
                    <div>
                      <MapPin className="w-8 h-8 mx-auto mb-3 text-amber" />
                      <p className="text-sm">No coordinates available for the active location.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Community Photos 
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
        </section> */}

        {/* Related Titles */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl text-foreground mb-5">You Might Also Like</h2>
          {relatedLoading && !relatedTitlesData ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 w-44 shrink-0 rounded-2xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {relatedTitles.map((t: any, i: number) => (
                <motion.div
                  key={t.id || `${t.title}-${t.year}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  onClick={() => openRelatedTitle(t)}
                  className="relative h-64 w-44 shrink-0 rounded-2xl overflow-hidden group cursor-pointer shadow-card"
                >
                  <img
                    src={t.coverImage || t.image || heroRomeImg}
                    alt={t.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 cinema-overlay" />
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      t.type === "Movie" ? "badge-movie" : t.type === "Series" ? "badge-series" : "badge-book"
                    }`}>
                      {t.type}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-3 h-3 text-amber fill-amber" />
                      <span className="text-xs font-semibold text-amber">{t.rating}</span>
                      <span className="text-xs text-muted-foreground ml-1">{t.year}</span>
                    </div>
                    <h3 className="font-serif text-foreground text-base leading-tight mb-1">{t.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <SpotActionsModal
          pin={selectedLocationPin}
          onClose={() => setSelectedLocationPin(null)}
        />
      </div>

      <FilmingTrailDialog
        open={trailOpen}
        onOpenChange={setTrailOpen}
        titleSlug={titleSlug}
        titleName={view.title}
        locations={view.locations.map((l) => ({
          label: l.label,
          lat: l.lat,
          lng: l.lng,
          description: l.description,
        }))}
      />
    </div>
  );
}
