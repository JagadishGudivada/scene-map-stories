import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Bookmark, CheckCircle2, Heart, Grid3X3, List, Users, Settings, Share2, X, Pencil, Plus, Globe, Trash2, Sparkles, Film } from "lucide-react";
import EditProfileDialog, { type ProfileRow } from "@/components/EditProfileDialog";
import CreatePostDialog from "@/components/CreatePostDialog";
import { Button } from "@/components/ui/button";
import { useAllSavedTitles, useAllSavedLocations, useAllSavedSpots, useAllVisitedSpots, useAllWatchedTitles } from "@/hooks/useSaved";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import FogOfWarMap from "@/components/profile/FogOfWarMap";
import TierBadge from "@/components/profile/TierBadge";
import MilestoneCelebration from "@/components/profile/MilestoneCelebration";
import RevealAchievementCard, { type RevealPayload } from "@/components/profile/RevealAchievementCard";
import NearbySpotBanner from "@/components/profile/NearbySpotBanner";
import MemoryLane from "@/components/profile/MemoryLane";
import StatCard from "@/components/profile/StatCard";
import SavedCard from "@/components/profile/SavedCard";
import { MILESTONES } from "@/lib/tiers";

type PostRow = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  title_slug: string | null;
  spot_slug: string | null;
  created_at: string;
};

type Tab = "map" | "saved" | "posts" | "lists";
type SavedFilter = "titles" | "locations" | "spots" | "been" | "watched";

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "map", label: "Memory Map", icon: MapPin },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "posts", label: "Posts", icon: Grid3X3 },
  { id: "lists", label: "Lists", icon: List },
];

function prettifySlug(slug: string) {
  return slug.replace(/-\d{4}$/, "").replace(/-/g, " ");
}


export default function Profile() {
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [savedFilter, setSavedFilter] = useState<SavedFilter>("titles");
  const { user: authUser } = useAuth();
  const { username: routeUsername } = useParams<{ username: string }>();
  const { toast } = useToast();
  const { slugs: savedTitleSlugs, loading: savedTitlesLoading, refresh: refreshTitles } = useAllSavedTitles();
  const { slugs: savedLocationSlugs, loading: savedLocationsLoading, refresh: refreshLocations } = useAllSavedLocations();
  const { slugs: savedSpotSlugs, loading: savedSpotsLoading, refresh: refreshSavedSpots } = useAllSavedSpots();
  const { slugs: visitedSpotSlugs, spots: visitedSpots, loading: visitedSpotsLoading, refresh: refreshVisitedSpots } = useAllVisitedSpots();
  const { slugs: watchedTitleSlugs, loading: watchedTitlesLoading } = useAllWatchedTitles();

  // Metadata for pretty cards (poster for titles, name/city for locations/spots)
  const [titleMeta, setTitleMeta] = useState<Record<string, { title: string; year: number | null; poster: string | null }>>({});
  const [locationMeta, setLocationMeta] = useState<Record<string, { name: string; city: string | null; country: string | null }>>({});
  const [spotMeta, setSpotMeta] = useState<Record<string, { name: string; city: string | null; country: string | null }>>({});

  useEffect(() => {
    const slugs = Array.from(new Set([...savedTitleSlugs, ...watchedTitleSlugs]));
    if (!slugs.length) { setTitleMeta({}); return; }
    supabase.from("titles").select("slug, title, year, poster_url").in("slug", slugs).then(({ data }) => {
      const map: Record<string, { title: string; year: number | null; poster: string | null }> = {};
      (data ?? []).forEach((r: any) => { map[r.slug] = { title: r.title, year: r.year, poster: r.poster_url }; });
      setTitleMeta(map);
    });
  }, [savedTitleSlugs, watchedTitleSlugs]);

  useEffect(() => {
    if (!savedLocationSlugs.length) { setLocationMeta({}); return; }
    supabase.from("locations").select("slug, name, city, country").in("slug", savedLocationSlugs).then(({ data }) => {
      const map: Record<string, { name: string; city: string | null; country: string | null }> = {};
      (data ?? []).forEach((r: any) => { map[r.slug] = { name: r.name, city: r.city, country: r.country }; });
      setLocationMeta(map);
    });
  }, [savedLocationSlugs]);

  useEffect(() => {
    if (!savedSpotSlugs.length) { setSpotMeta({}); return; }
    supabase.from("spots").select("slug, name, city, country").in("slug", savedSpotSlugs).then(({ data }) => {
      const map: Record<string, { name: string; city: string | null; country: string | null }> = {};
      (data ?? []).forEach((r: any) => { map[r.slug] = { name: r.name, city: r.city, country: r.country }; });
      setSpotMeta(map);
    });
  }, [savedSpotSlugs]);

  // Load profile row (own or by username param)
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    if (routeUsername) {
      const { data } = await supabase.from("profiles").select("*").eq("username", routeUsername).maybeSingle();
      if (data) { setProfile(data as ProfileRow); return; }
      // Fallback: route username didn't match any profile. If the viewer is logged in
      // and the route looks like their own derived username, load their profile by user_id.
      if (authUser) {
        const meta = (authUser.user_metadata ?? {}) as Record<string, any>;
        const derived = (meta.user_name || meta.preferred_username || authUser.email?.split("@")[0] || "").toLowerCase();
        if (derived && derived === routeUsername.toLowerCase()) {
          const { data: own } = await supabase.from("profiles").select("*").eq("user_id", authUser.id).maybeSingle();
          if (own) setProfile(own as ProfileRow);
        }
      }
      return;
    }
    if (authUser) {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", authUser.id).maybeSingle();
      if (data) setProfile(data as ProfileRow);
    }
  }, [routeUsername, authUser]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const profileUserId = profile?.user_id ?? (routeUsername ? null : authUser?.id) ?? null;
  // Own profile when: viewing own loaded profile, OR viewing route that has no profile yet but matches the logged-in user.
  const isOwnProfile = !!authUser && (
    (profile && profile.user_id === authUser.id) ||
    (!routeUsername) ||
    (!profile && (() => {
      const meta = (authUser.user_metadata ?? {}) as Record<string, any>;
      const derived = (meta.user_name || meta.preferred_username || authUser.email?.split("@")[0] || "").toLowerCase();
      return !!derived && derived === routeUsername.toLowerCase();
    })())
  );

  const loadPosts = useCallback(async () => {
    if (!profileUserId) return;
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", profileUserId)
      .order("created_at", { ascending: false });
    setPosts((data ?? []) as PostRow[]);
  }, [profileUserId]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Derive identity preferring profile row, falling back to auth metadata
  const meta = (authUser?.user_metadata ?? {}) as Record<string, any>;
  const displayName: string =
    profile?.display_name || meta.full_name || meta.name || meta.user_name || authUser?.email?.split("@")[0] || "Your Profile";
  const username: string =
    profile?.username || routeUsername || meta.user_name || meta.preferred_username || authUser?.email?.split("@")[0] || "you";
  const avatarUrl: string | undefined = profile?.avatar_url || meta.avatar_url || meta.picture;
  const coverUrl: string | undefined = profile?.cover_url || undefined;
  const bio: string | undefined = profile?.bio || undefined;
  const userLocation: string | undefined = profile?.location || undefined;
  const website: string | undefined = profile?.website || undefined;
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleDeletePost = async (id: string) => {
    if (!authUser) return;
    await supabase.from("posts").delete().eq("id", id).eq("user_id", authUser.id);
    toast({ title: "Post deleted" });
    loadPosts();
  };

  const visitedSpotsData = useMemo(
    () =>
      visitedSpots
        .filter((spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng) && !(spot.lat === 0 && spot.lng === 0))
        .map((spot) => ({
          slug: spot.spot_slug,
          name: spot.spot_name,
          lat: spot.lat,
          lng: spot.lng,
          city: spot.city,
          country: spot.country,
          type: spot.type,
          title: spot.city,
        })),
    [visitedSpots]
  );

  // Reveal + milestones + focus for fog map
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [focusPin, setFocusPin] = useState<{ lat: number; lng: number } | null>(null);
  const [memoryLaneOpen, setMemoryLaneOpen] = useState(false);
  const shownMilestonesRef = useRef<Set<number>>(new Set());

  // Load already-shown milestones once
  useEffect(() => {
    if (!authUser || !isOwnProfile) return;
    supabase
      .from("user_milestones")
      .select("milestone")
      .eq("user_id", authUser.id)
      .then(({ data }) => {
        shownMilestonesRef.current = new Set((data ?? []).map((r: any) => r.milestone));
      });
  }, [authUser, isOwnProfile]);

  // Listen for reveal events, refresh visited list, check milestone
  useEffect(() => {
    if (!isOwnProfile) return;
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        spotSlug: string; spotName: string; lat?: number; lng?: number;
        city?: string; country?: string; type?: "Movie" | "Series" | "Book";
      };
      // Try to enrich with a related title poster
      let title: string | undefined;
      let poster: string | null | undefined;
      try {
        const { data: spotRow } = await supabase
          .from("spots")
          .select("id")
          .eq("slug", detail.spotSlug)
          .maybeSingle();
        const spotId = (spotRow as any)?.id;
        if (spotId) {
          const { data: rels } = await supabase
            .from("title_spots")
            .select("title_id")
            .eq("spot_id", spotId)
            .limit(1);
          const titleId = (rels?.[0] as any)?.title_id;
          if (titleId) {
            const { data: t } = await supabase
              .from("titles")
              .select("title, poster_url")
              .eq("id", titleId)
              .maybeSingle();
            title = (t as any)?.title ?? undefined;
            poster = (t as any)?.poster_url ?? null;
          }
        }
      } catch { /* ignore */ }

      setReveal({
        spotName: detail.spotName,
        city: detail.city,
        country: detail.country,
        lat: detail.lat,
        lng: detail.lng,
        type: detail.type,
        title,
        poster: poster ?? null,
      });
      if (detail.lat != null && detail.lng != null) {
        setFocusPin({ lat: detail.lat, lng: detail.lng });
      }
      setActiveTab("map");

      await refreshVisitedSpots();

      // Determine new count and check milestones
      if (authUser) {
        const { count } = await supabase
          .from("visited_spots")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.id);
        if (count != null) {
          const hit = MILESTONES.find((m) => m === count && !shownMilestonesRef.current.has(m));
          if (hit) {
            shownMilestonesRef.current.add(hit);
            await supabase.from("user_milestones").insert({ user_id: authUser.id, milestone: hit });
            setMilestone(hit);
          }
        }
      }
    };
    window.addEventListener("spot:revealed", handler as EventListener);
    return () => window.removeEventListener("spot:revealed", handler as EventListener);
  }, [isOwnProfile, authUser, refreshVisitedSpots]);


  const visitedMapPins = useMemo(
    () =>
      visitedSpotsData.map((spot) => ({
        lat: spot.lat,
        lng: spot.lng,
        label: spot.name,
        title: spot.title,
        type: spot.type,
        city: spot.city,
        country: spot.country,
        visited: true,
      })),
    [visitedSpotsData]
  );

  const visitedCities = useMemo(() => {
    const map = new Map<string, { name: string; lat: number; lng: number; count: number }>();
    visitedSpotsData.forEach((s) => {
      const key = `${s.city ?? ""}|${s.country ?? ""}`;
      if (!s.city) return;
      const existing = map.get(key);
      if (existing) {
        existing.lat = (existing.lat * existing.count + s.lat) / (existing.count + 1);
        existing.lng = (existing.lng * existing.count + s.lng) / (existing.count + 1);
        existing.count += 1;
      } else {
        map.set(key, { name: s.city, lat: s.lat, lng: s.lng, count: 1 });
      }
    });
    return Array.from(map.values());
  }, [visitedSpotsData]);

  const visitedCountriesCount = useMemo(
    () => new Set(visitedSpotsData.map((spot) => spot.country)).size,
    [visitedSpotsData]
  );

  const handleUnsaveTitle = async (titleSlug: string) => {
    if (!authUser) return;
    await supabase.from("saved_titles").delete().eq("user_id", authUser.id).eq("title_slug", titleSlug);
    toast({ title: "Removed", description: "Title removed from saved list." });
    refreshTitles();
  };

  const handleUnsaveLocation = async (locationSlug: string) => {
    if (!authUser) return;
    await supabase.from("saved_locations").delete().eq("user_id", authUser.id).eq("location_slug", locationSlug);
    toast({ title: "Removed", description: "Location removed from saved list." });
    refreshLocations();
  };

  const handleUnsaveSpot = async (spotSlug: string) => {
    if (!authUser) return;
    await supabase.from("saved_spots").delete().eq("user_id", authUser.id).eq("spot_slug", spotSlug);
    toast({ title: "Removed", description: "Spot removed from wishlist." });
    refreshSavedSpots();
  };

  const handleUnvisitSpot = async (spotSlug: string) => {
    if (!authUser) return;
    await supabase.from("visited_spots").delete().eq("user_id", authUser.id).eq("spot_slug", spotSlug);
    toast({ title: "Removed", description: "Spot removed from visited list." });
    refreshVisitedSpots();
  };

  const handleShare = async () => {
    const url = profile?.username
      ? `${window.location.origin}/passport/${profile.username}`
      : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${displayName}'s Cinematic Passport`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Passport link copied", description: "Share your cinematic passport anywhere." });
      }
    } catch {
      /* user cancelled */
    }
  };

  const stats: { label: string; value: number; icon: typeof Bookmark; color: string; jump?: { tab: Tab; filter?: SavedFilter } }[] = [
    { label: "Titles", value: savedTitleSlugs.length, icon: Bookmark, color: "text-amber", jump: { tab: "saved", filter: "titles" } },
    { label: "Spots", value: visitedSpotSlugs.length, icon: MapPin, color: "text-teal", jump: { tab: "saved", filter: "been" } },
    { label: "Countries", value: visitedCountriesCount, icon: Users, color: "text-foreground", jump: { tab: "map" } },
    { label: "Watched", value: watchedTitleSlugs.length, icon: Heart, color: "text-foreground", jump: { tab: "saved", filter: "watched" } },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-black pb-24 md:pb-12">
      <Seo
        title={`${displayName} (@${username}) — Memory Map`}
        description={`Filming locations, saved spots, and cinema journeys from ${displayName} on Sarevista.`}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-14 space-y-5 sm:space-y-14">
        {/* Editorial header */}
        <header className="relative flex flex-col items-center text-center">
          {/* Cover wash */}
          <div className="pointer-events-none absolute inset-x-0 -top-10 h-56 sm:h-64 bg-gradient-to-b from-amber/10 via-background/0 to-transparent rounded-3xl -z-10" aria-hidden />
          {coverUrl && (
            <div className="pointer-events-none absolute inset-x-0 -top-10 h-56 sm:h-64 overflow-hidden rounded-3xl -z-10">
              <img src={coverUrl} alt="" className="w-full h-full object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
            </div>
          )}

          {/* Avatar with amber halo */}
          <div className="relative group">
            <div className="absolute inset-0 bg-amber/25 rounded-full blur-2xl group-hover:bg-amber/40 transition-all" aria-hidden />
            <div className="relative w-20 h-20 sm:w-32 sm:h-32 rounded-full border-2 border-amber/40 p-1 bg-background shadow-float">
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-muted to-card flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif italic text-3xl sm:text-4xl text-amber">{initials || "?"}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 sm:mt-6 space-y-1">
            <h1 className="font-serif text-3xl sm:text-5xl text-foreground tracking-tight leading-none">
              {displayName}
            </h1>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <p className="font-serif italic text-base sm:text-lg text-amber/90 tracking-tight">
                @{username}
              </p>
              <TierBadge count={visitedSpotSlugs.length} />
            </div>
          </div>

          {bio && (
            <p className="mt-3 sm:mt-5 max-w-xl text-[13px] sm:text-[15px] text-foreground/85 leading-relaxed whitespace-pre-wrap line-clamp-2 sm:line-clamp-none">
              {bio}
            </p>
          )}

          {(userLocation || website || (isOwnProfile && authUser?.email)) && (
            <div className="mt-2 sm:mt-4 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-1 text-muted-foreground text-[11px] sm:text-sm">
              {userLocation && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber" />{userLocation}</span>
              )}
              {website && (
                <a href={website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Globe className="w-3.5 h-3.5 text-teal" />{website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {isOwnProfile && authUser?.email && (
                <span className="hidden sm:flex items-center gap-1.5 opacity-70 font-mono text-[11px]">{authUser.email}</span>
              )}
            </div>
          )}

          {/* Action pills */}
          <div className="mt-3 sm:mt-6 flex items-center justify-center gap-2 flex-wrap">
            {isOwnProfile && (
              <>
                <Button size="sm" onClick={() => setPostOpen(true)} aria-label="Post" title="Post" className="rounded-full h-9 w-9 sm:w-auto sm:px-5 p-0 sm:p-2">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Post</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} aria-label="Edit profile" title="Edit profile" className="rounded-full h-9 w-9 sm:w-auto sm:px-5 p-0 sm:p-2">
                  <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">Edit profile</span>
                </Button>
              </>
            )}
            <button
              onClick={handleShare}
              aria-label="Share passport"
              title="Share passport"
              className="h-9 w-9 sm:w-auto sm:px-5 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:border-amber/40 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 text-amber" /> <span className="hidden sm:inline">Share passport</span>
            </button>
            {isOwnProfile && profile?.username && (
              <Link
                to={`/passport/${profile.username}`}
                aria-label="View public passport"
                title="View public passport"
                className="h-9 w-9 sm:w-auto sm:px-5 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:border-amber/40 transition-colors flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4 text-teal" /> <span className="hidden sm:inline">View public passport</span>
              </Link>
            )}
            {isOwnProfile && (
              <Link
                to="/auth"
                className="h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Account settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
            )}
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {stats.map((stat, i) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              delay={i * 0.08}
              onClick={() => {
                if (!stat.jump) return;
                setActiveTab(stat.jump.tab);
                if (stat.jump.filter) setSavedFilter(stat.jump.filter);
              }}
            />
          ))}
        </div>

        {/* Tabs */}
        <div>
          <nav className="flex justify-center border-b border-border dark:border-white/[0.06]">
            <div className="flex gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-px">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-label={tab.label}
                    title={tab.label}
                    className={`relative px-4 sm:px-5 pb-3.5 pt-2 text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors ${
                      active ? "text-amber" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="activeTabIndicator"
                        className="absolute inset-x-2 inset-y-1 rounded-full bg-amber/10 border border-amber/30 shadow-[0_0_20px_-4px_rgba(255,184,0,0.5)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {active && (
                      <motion.span
                        layoutId="activeTabBar"
                        className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-amber/0 via-amber to-amber/0"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      <tab.icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "map" && (
              <div className="space-y-6">
                {isOwnProfile && <NearbySpotBanner />}
                <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground">
                  <span className="font-mono uppercase tracking-[0.18em]">
                    {visitedMapPins.length} locations · {visitedCountriesCount} countries
                  </span>
                  {visitedSpotsData.length > 0 && (
                    <motion.button
                      onClick={() => setMemoryLaneOpen(true)}
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.03 }}
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(255,184,0,0.55), 0 0 24px 0 rgba(255,184,0,0.35)",
                          "0 0 0 10px rgba(255,184,0,0), 0 0 40px 4px rgba(255,184,0,0.55)",
                          "0 0 0 0 rgba(255,184,0,0.55), 0 0 24px 0 rgba(255,184,0,0.35)",
                        ],
                      }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber via-[#FFB800] to-amber text-black text-xs font-semibold tracking-wide"
                    >
                      <Film className="w-3.5 h-3.5" />
                      Replay My Journey
                    </motion.button>
                  )}
                </div>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  className="rounded-2xl overflow-hidden border border-border dark:border-white/[0.06] shadow-[0_20px_60px_-24px_rgba(0,0,0,0.8)]"
                >
                  <FogOfWarMap
                    pins={visitedMapPins}
                    visitedCountries={visitedSpotsData.map((s) => s.country).filter(Boolean) as string[]}
                    focusPin={focusPin}
                    className="h-[420px] sm:h-[520px]"
                  />
                </motion.div>
                {visitedSpotsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : visitedSpotsData.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visitedSpotsData.map((spot, i) => (
                      <motion.div
                        key={spot.slug}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        className="group bg-card/30 rounded-xl p-4 border border-border/60 hover:border-teal/40 hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-teal" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-amber transition-colors">{spot.name}</p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                              {spot.city}{spot.country ? ` · ${spot.country}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-teal">Been</span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card/30 rounded-2xl border border-dashed border-border p-12 text-center">
                    <MapPin className="w-7 h-7 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      No visited spots yet. Mark a spot with "I've Been Here" to populate your memory map.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "saved" && (() => {
              const filters: { id: SavedFilter; label: string; count: number; icon: typeof Bookmark }[] = [
                { id: "titles", label: "Titles", count: savedTitleSlugs.length, icon: Bookmark },
                { id: "locations", label: "Locations", count: savedLocationSlugs.length, icon: MapPin },
                { id: "spots", label: "Wishlist", count: savedSpotSlugs.length, icon: Sparkles },
                { id: "been", label: "Been Here", count: visitedSpotSlugs.length, icon: CheckCircle2 },
                { id: "watched", label: "Watched", count: watchedTitleSlugs.length, icon: Film },
              ];

              const renderGrid = (
                items: { slug: string; label: string; onUnsave?: (s: string) => void; href: string; accent: "amber" | "teal"; icon: typeof Bookmark; query?: string }[],
                emptyMsg: string,
                emptyIcon: typeof Bookmark
              ) => {
                if (items.length === 0) {
                  const EmptyIcon = emptyIcon;
                  return (
                    <div className="bg-card/30 rounded-2xl border border-dashed border-border p-12 text-center">
                      <EmptyIcon className="w-7 h-7 text-muted-foreground/60 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">{emptyMsg}</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {items.map((item, i) => (
                      <SavedCard key={item.slug} item={item} index={i} />
                    ))}
                  </div>
                );
              };

              const grids: Record<SavedFilter, { loading: boolean; node: React.ReactNode; count: number }> = {
                titles: {
                  loading: savedTitlesLoading,
                  count: savedTitleSlugs.length,
                  node: renderGrid(
                    savedTitleSlugs.map((slug) => {
                      const meta = titleMeta[slug];
                      const label = meta?.title ?? prettifySlug(slug);
                      return {
                        slug, label, href: `/title/${slug}`, accent: "amber",
                        icon: Bookmark, onUnsave: handleUnsaveTitle,
                        imageUrl: meta?.poster ?? undefined,
                        imageFit: meta?.poster ? "poster" : "cover",
                        query: `${label} movie poster`,
                      };
                    }),
                    "No saved titles yet. Browse a title and tap Save to Map.",
                    Bookmark
                  ),
                },
                locations: {
                  loading: savedLocationsLoading,
                  count: savedLocationSlugs.length,
                  node: renderGrid(
                    savedLocationSlugs.map((slug) => {
                      const meta = locationMeta[slug];
                      const label = meta?.name ?? slug.replace(/-/g, " ");
                      const place = [meta?.city, meta?.country].filter(Boolean).join(" ");
                      return {
                        slug, label, href: `/location/${slug}`, accent: "teal",
                        icon: MapPin, onUnsave: handleUnsaveLocation,
                        query: `${label} ${place} cityscape travel landmark`.trim(),
                      };
                    }),
                    "No saved locations yet. Open a location and tap Save City.",
                    MapPin
                  ),
                },
                spots: {
                  loading: savedSpotsLoading,
                  count: savedSpotSlugs.length,
                  node: renderGrid(
                    savedSpotSlugs.map((slug) => {
                      const meta = spotMeta[slug];
                      const label = meta?.name ?? slug.replace(/-/g, " ");
                      const place = [meta?.city, meta?.country].filter(Boolean).join(" ");
                      return {
                        slug, label, href: `/spot/${slug}`, accent: "amber",
                        icon: Sparkles, onUnsave: handleUnsaveSpot,
                        query: `${label} ${place} landmark`.trim(),
                      };
                    }),
                    "No spots on your wishlist yet. Open a spot and tap Save Spot.",
                    Sparkles
                  ),
                },
                been: {
                  loading: visitedSpotsLoading,
                  count: visitedSpotSlugs.length,
                  node: renderGrid(
                    visitedSpotSlugs.map((slug) => {
                      const p = visitedSpots.find((s) => s.spot_slug === slug);
                      const label = p?.spot_name ?? slug.replace(/-/g, " ");
                      const place = [p?.city, p?.country].filter(Boolean).join(" ");
                      return {
                        slug, label, href: `/spot/${slug}`, accent: "teal" as const,
                        icon: CheckCircle2, onUnsave: handleUnvisitSpot,
                        query: `${label} ${place} landmark`.trim(),
                      };
                    }),
                    "No visited spots yet. Tap I've Been Here on any spot.",
                    CheckCircle2
                  ),
                },
                watched: {
                  loading: watchedTitlesLoading,
                  count: watchedTitleSlugs.length,
                  node: renderGrid(
                    watchedTitleSlugs.map((slug) => {
                      const meta = titleMeta[slug];
                      const label = meta?.title ?? prettifySlug(slug);
                      return {
                        slug, label, href: `/title/${slug}`, accent: "teal" as const,
                        icon: Film,
                        imageUrl: meta?.poster ?? undefined,
                        imageFit: meta?.poster ? "poster" : "cover",
                        query: `${label} movie poster`,
                      };
                    }),
                    "No watched titles yet. Open a title and tap Watched.",
                    Film
                  ),
                },
              };

              const currentLabel = filters.find((f) => f.id === savedFilter)?.label ?? "Items";
              const currentCount = grids[savedFilter].count;

              return (
                <div className="space-y-6">
                  {/* Filter pills */}
                  <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 min-w-max">
                      {filters.map((f) => {
                        const active = savedFilter === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSavedFilter(f.id)}
                            aria-label={f.label}
                            title={f.label}
                            className={`h-9 px-3 sm:px-4 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95 ${
                              active
                                ? "bg-foreground text-background border border-foreground"
                                : "bg-card/30 border border-border text-muted-foreground hover:text-foreground hover:border-amber/30"
                            }`}
                          >
                            <f.icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            <span className="hidden sm:inline">{f.label}</span>
                            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold ${active ? "bg-background/20" : "bg-muted"}`}>
                              {f.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Count strip */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/50 pb-3">
                    <span className="font-mono uppercase tracking-[0.18em]">
                      {currentCount} {currentLabel}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={savedFilter}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      {grids[savedFilter].loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-2xl bg-muted/40 animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        grids[savedFilter].node
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              );
            })()}

            {activeTab === "posts" && (
              <div className="space-y-5">
                {isOwnProfile && (
                  <button
                    onClick={() => setPostOpen(true)}
                    className="w-full bg-card/30 rounded-2xl border border-dashed border-border p-4 flex items-center gap-3 text-left hover:border-amber/60 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center text-amber shrink-0">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-muted-foreground">Share a scene, memory, or recommendation…</span>
                  </button>
                )}
                {posts.length === 0 ? (
                  <div className="bg-card/30 rounded-2xl border border-dashed border-border p-12 text-center">
                    <Grid3X3 className="w-7 h-7 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      No posts yet.{isOwnProfile && " Tap “Post” to share your first one."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {posts.map((p, i) => (
                      <motion.article
                        key={p.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.3) }}
                        className="group bg-card/30 rounded-2xl border border-border/60 overflow-hidden hover:border-amber/30 hover:-translate-y-0.5 transition-all"
                      >
                        {p.image_url && (
                          <div className="aspect-[16/10] overflow-hidden bg-muted">
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed flex-1">{p.content}</p>
                            {isOwnProfile && (
                              <button
                                onClick={() => handleDeletePost(p.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                title="Delete post"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            {p.title_slug && (
                              <Link to={`/title/${p.title_slug}`} className="px-2 py-0.5 rounded bg-amber/10 text-amber font-mono text-[10px] uppercase tracking-tighter font-bold capitalize">
                                {prettifySlug(p.title_slug)}
                              </Link>
                            )}
                            {p.spot_slug && (
                              <Link to={`/spot/${p.spot_slug}`} className="px-2 py-0.5 rounded bg-teal/10 text-teal font-mono text-[10px] uppercase tracking-tighter font-bold capitalize">
                                {p.spot_slug.replace(/-/g, " ")}
                              </Link>
                            )}
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "lists" && (
              <div className="bg-card/30 rounded-2xl border border-dashed border-border p-12 text-center">
                <List className="w-7 h-7 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  No lists yet. Curated collections are coming soon — your saved titles, locations and spots already live in the Saved tab.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onSaved={(p) => setProfile(p)}
      />
      <CreatePostDialog open={postOpen} onOpenChange={setPostOpen} onPosted={loadPosts} />
      <RevealAchievementCard payload={reveal} onClose={() => setReveal(null)} />
      <MilestoneCelebration milestone={milestone} onClose={() => setMilestone(null)} />
      <MemoryLane
        open={memoryLaneOpen}
        onClose={() => setMemoryLaneOpen(false)}
        spots={visitedSpots}
        displayName={displayName}
        tierCount={visitedMapPins.length}
      />

    </div>
  );
}
