import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Bookmark, CheckCircle2, Heart, Grid3X3, List, Users, Settings, Share2, X, Pencil, Plus, Globe, Trash2, Sparkles, Film } from "lucide-react";
import LeafletMap from "@/components/LeafletMap";
import EditProfileDialog, { type ProfileRow } from "@/components/EditProfileDialog";
import CreatePostDialog from "@/components/CreatePostDialog";
import PassportStampBadge from "@/components/PassportStampBadge";
import { Button } from "@/components/ui/button";
import { useAllSavedTitles, useAllSavedLocations, useAllSavedSpots, useAllVisitedSpots, useAllWatchedTitles } from "@/hooks/useSaved";
import { usePassportBadges } from "@/hooks/usePassportBadges";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { fetchPexelsImage, DEFAULT_PEXELS_IMAGE } from "@/lib/pexels";
import Seo from "@/components/Seo";

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
  const { badges: passportBadges } = usePassportBadges(visitedSpots, authUser?.id);

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
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayName, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Profile URL copied to clipboard." });
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
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <Seo
        title={`${displayName} (@${username}) — Memory Map`}
        description={`Filming locations, saved spots, and cinema journeys from ${displayName} on Sarevista.`}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 space-y-10 sm:space-y-14">
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
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-amber/40 p-1 bg-background shadow-float">
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-muted to-card flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif italic text-4xl text-amber">{initials || "?"}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-6 space-y-1.5">
            <h1 className="font-serif text-4xl sm:text-5xl text-foreground tracking-tight leading-none">
              {displayName}
            </h1>
            <p className="font-mono text-xs sm:text-sm text-muted-foreground tracking-wider">
              @{username}
            </p>
          </div>

          {bio && (
            <p className="mt-5 max-w-xl text-sm sm:text-[15px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
              {bio}
            </p>
          )}

          {(userLocation || website || (isOwnProfile && authUser?.email)) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-muted-foreground text-xs sm:text-sm">
              {userLocation && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber" />{userLocation}</span>
              )}
              {website && (
                <a href={website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Globe className="w-3.5 h-3.5 text-teal" />{website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {isOwnProfile && authUser?.email && (
                <span className="flex items-center gap-1.5 opacity-70 font-mono text-[11px]">{authUser.email}</span>
              )}
            </div>
          )}

          {/* Action pills */}
          <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
            {isOwnProfile && (
              <>
                <Button size="sm" onClick={() => setPostOpen(true)} className="rounded-full px-5 h-9">
                  <Plus className="w-4 h-4" /> Post
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="rounded-full px-5 h-9">
                  <Pencil className="w-4 h-4" /> Edit profile
                </Button>
              </>
            )}
            <button
              onClick={handleShare}
              className="h-9 px-5 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:border-amber/40 transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4 text-amber" /> Share Profile
            </button>
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

        {/* Stats + Passport bento */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
          {/* Stats */}
          <div className="md:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={() => {
                  if (!stat.jump) return;
                  setActiveTab(stat.jump.tab);
                  if (stat.jump.filter) setSavedFilter(stat.jump.filter);
                }}
                className="bg-card/40 border border-border/60 px-4 py-5 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-amber/30 transition-all active:scale-[0.97] group"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </span>
                <span className={`font-serif text-3xl sm:text-4xl leading-none ${stat.color}`}>
                  {stat.value}
                </span>
              </button>
            ))}
          </div>

          {/* Passport */}
          <section className="md:col-span-4 relative bg-card/40 border border-border/60 rounded-2xl p-5 overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber/10 blur-3xl rounded-full group-hover:bg-amber/15 transition-colors" aria-hidden />
            <div className="relative flex items-start justify-between gap-3 mb-4">
              <div className="space-y-0.5">
                <h2 className="font-serif text-lg text-foreground leading-tight">Passport Stamps</h2>
                <p className="text-[11px] text-muted-foreground">Unlocked through site visits</p>
              </div>
              <span className="px-2 py-1 rounded bg-amber/10 text-amber font-mono text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap">
                {passportBadges.length} earned
              </span>
            </div>

            {visitedSpotsLoading ? (
              <div className="grid grid-cols-5 gap-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-full bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : passportBadges.length === 0 ? (
              <div className="grid grid-cols-5 gap-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-full border border-dashed border-border/80" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {passportBadges.slice(0, 10).map((badge) => (
                  <div key={badge.id} className="flex flex-col items-center text-center gap-1">
                    <PassportStampBadge
                      badge={badge}
                      country={badge.country}
                      size="sm"
                      generateOnMiss={isOwnProfile}
                    />
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground truncate w-full">
                      {badge.country}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Tabs */}
        <div>
          <nav className="flex justify-center border-b border-border">
            <div className="flex gap-2 sm:gap-6 overflow-x-auto no-scrollbar pb-px">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-3 sm:px-4 pb-3.5 pt-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                      active ? "text-amber" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-amber rounded-full" />}
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
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono uppercase tracking-[0.18em]">
                    {visitedMapPins.length} locations · {visitedCountriesCount} countries
                  </span>
                </div>
                <LeafletMap pins={visitedMapPins} visitedCities={visitedCities} className="h-80 sm:h-96 rounded-2xl overflow-hidden border border-border" />
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
                items: { slug: string; label: string; onUnsave?: (s: string) => void; href: string; accent: "amber" | "teal"; icon: typeof Bookmark }[],
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
                    {items.map((item, i) => {
                      const Icon = item.icon;
                      const accentBg = item.accent === "amber" ? "bg-amber/10" : "bg-teal/10";
                      const accentText = item.accent === "amber" ? "text-amber" : "text-teal";
                      return (
                        <motion.div
                          key={item.slug}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                          className="group relative bg-card/30 rounded-2xl border border-border/60 p-4 aspect-square flex flex-col justify-between overflow-hidden hover:border-amber/40 hover:-translate-y-0.5 transition-all"
                        >
                          <Link to={item.href} className="absolute inset-0 z-10" aria-label={item.label} />
                          <div className={`w-9 h-9 rounded-xl ${accentBg} ${accentText} flex items-center justify-center`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="relative z-0 space-y-1">
                            <span className="block text-sm font-medium text-foreground capitalize leading-snug line-clamp-2 group-hover:text-amber transition-colors">
                              {item.label}
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                              {item.accent === "amber" ? "Saved" : "Visited"}
                            </span>
                          </div>
                          {item.onUnsave && (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); item.onUnsave!(item.slug); }}
                              className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                );
              };

              const grids: Record<SavedFilter, { loading: boolean; node: React.ReactNode; count: number }> = {
                titles: {
                  loading: savedTitlesLoading,
                  count: savedTitleSlugs.length,
                  node: renderGrid(
                    savedTitleSlugs.map((slug) => ({ slug, label: prettifySlug(slug), href: `/title/${slug}`, accent: "amber", icon: Bookmark, onUnsave: handleUnsaveTitle })),
                    "No saved titles yet. Browse a title and tap Save to Map.",
                    Bookmark
                  ),
                },
                locations: {
                  loading: savedLocationsLoading,
                  count: savedLocationSlugs.length,
                  node: renderGrid(
                    savedLocationSlugs.map((slug) => ({ slug, label: slug.replace(/-/g, " "), href: `/location/${slug}`, accent: "teal", icon: MapPin, onUnsave: handleUnsaveLocation })),
                    "No saved locations yet. Open a location and tap Save City.",
                    MapPin
                  ),
                },
                spots: {
                  loading: savedSpotsLoading,
                  count: savedSpotSlugs.length,
                  node: renderGrid(
                    savedSpotSlugs.map((slug) => ({ slug, label: slug.replace(/-/g, " "), href: `/spot/${slug}`, accent: "amber", icon: Sparkles, onUnsave: handleUnsaveSpot })),
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
                      return { slug, label: p?.spot_name ?? slug.replace(/-/g, " "), href: `/spot/${slug}`, accent: "teal" as const, icon: CheckCircle2, onUnsave: handleUnvisitSpot };
                    }),
                    "No visited spots yet. Tap I've Been Here on any spot.",
                    CheckCircle2
                  ),
                },
                watched: {
                  loading: watchedTitlesLoading,
                  count: watchedTitleSlugs.length,
                  node: renderGrid(
                    watchedTitleSlugs.map((slug) => ({ slug, label: prettifySlug(slug), href: `/title/${slug}`, accent: "teal" as const, icon: Film })),
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
                            className={`h-9 px-4 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95 ${
                              active
                                ? "bg-foreground text-background border border-foreground"
                                : "bg-card/30 border border-border text-muted-foreground hover:text-foreground hover:border-amber/30"
                            }`}
                          >
                            <f.icon className="w-3.5 h-3.5" />
                            {f.label}
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
    </div>
  );
}
