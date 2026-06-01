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
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Cover */}
      <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-gradient-to-br from-amber/20 via-background to-teal/20">
        {coverUrl && <img src={coverUrl} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Profile Header */}
        <div className="-mt-16 relative z-10 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="w-28 h-28 rounded-full overflow-hidden amber-ring border-4 border-background shrink-0 shadow-float bg-muted flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-3xl text-amber">{initials || "?"}</span>
                )}
              </div>
              <div className="pb-1">
                <h1 className="font-serif text-2xl text-foreground leading-tight">{displayName}</h1>
                <p className="text-muted-foreground text-sm">@{username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isOwnProfile && (
                <>
                  <Button size="sm" onClick={() => setPostOpen(true)} className="rounded-xl">
                    <Plus className="w-4 h-4" /> Post
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="rounded-xl">
                    <Pencil className="w-4 h-4" /> Edit profile
                  </Button>
                </>
              )}
              <button
                onClick={handleShare}
                className="h-9 px-4 rounded-xl glass border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              {isOwnProfile && (
                <Link
                  to="/auth"
                  className="h-9 w-9 rounded-xl glass border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Account settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {bio && <p className="mt-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{bio}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground text-sm">
            {userLocation && (
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-amber" />{userLocation}</span>
            )}
            {website && (
              <a href={website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground">
                <Globe className="w-4 h-4 text-teal" />{website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {isOwnProfile && authUser?.email && (
              <span className="flex items-center gap-1.5 opacity-70">{authUser.email}</span>
            )}
          </div>

          {/* Stats — tap to jump */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {stats.map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={() => {
                  if (!stat.jump) return;
                  setActiveTab(stat.jump.tab);
                  if (stat.jump.filter) setSavedFilter(stat.jump.filter);
                }}
                className="glass rounded-2xl border border-border py-3 px-2 flex flex-col items-center gap-1 active:scale-95 hover:border-amber/40 transition-all"
              >
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                <span className={`text-xl font-bold font-serif leading-none ${stat.color}`}>{stat.value}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
              </button>
            ))}
          </div>


          <section className="mt-5 glass rounded-2xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-serif text-lg text-foreground">My Passport</h2>
                <p className="text-xs text-muted-foreground">Country stamps earned from visited filming spots</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-amber/10 text-amber font-medium">
                {passportBadges.length} unlocked
              </span>
            </div>

            {visitedSpotsLoading ? (
              <p className="text-sm text-muted-foreground">Loading passport stamps...</p>
            ) : passportBadges.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center">
                <p className="text-sm text-muted-foreground">No passport stamps yet. Mark your first spot with "I've Been Here" to unlock one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {passportBadges.map((badge) => (
                  <div key={badge.id} className="flex flex-col items-center text-center gap-2">
                    <PassportStampBadge
                      badge={badge}
                      country={badge.country}
                      size="sm"
                      generateOnMiss={isOwnProfile}
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground truncate max-w-[9rem]">{badge.country}</p>
                      {badge.tier !== "bronze" && (
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{badge.tier}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Tabs */}
        <div className="relative z-20 flex border-b border-border mb-6 overflow-x-auto no-scrollbar bg-background">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`touch-manipulation flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-amber text-amber"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "map" && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  {visitedMapPins.length} locations pinned across {visitedCountriesCount} countries
                </p>
                <LeafletMap pins={visitedMapPins} visitedCities={visitedCities} className="h-80" />
                {visitedSpotsLoading ? (
                  <div className="glass rounded-2xl border border-border p-8 text-center mt-6">
                    <p className="text-muted-foreground text-sm">Loading your visited spots…</p>
                  </div>
                ) : visitedSpotsData.length > 0 ? (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visitedSpotsData.slice(0, 6).map((spot, i) => (
                      <motion.div
                        key={spot.slug}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass rounded-xl p-4 border border-border flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-teal" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{spot.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{spot.city}, {spot.country}</p>
                          </div>
                        </div>
                        <span className="text-xs text-teal font-medium">Been here</span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="glass rounded-2xl border border-border p-8 text-center mt-6">
                    <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No visited spots yet. Mark a spot with "I've Been Here" to populate your memory map.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "saved" && (
              <div>
                {/* Saved Titles */}
                <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber" /> Saved Titles
                </h3>
                {savedTitlesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : savedTitleSlugs.length === 0 ? (
                  <div className="glass rounded-2xl border border-border p-8 text-center mb-6">
                    <Bookmark className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No saved titles yet. Browse titles and tap "Save to Map".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {savedTitleSlugs.map((slug, i) => (
                      <motion.div
                        key={slug}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group glass rounded-xl p-4 border border-border flex items-center justify-between"
                      >
                        <Link to={`/title/${slug}`} className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-amber/10 flex items-center justify-center">
                            <Bookmark className="w-4 h-4 text-amber" />
                          </div>
                          <span className="text-sm font-medium text-foreground capitalize truncate">{prettifySlug(slug)}</span>
                        </Link>
                        <button
                          onClick={() => handleUnsaveTitle(slug)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove from saved"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Saved Locations */}
                <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2 mt-6">
                  <MapPin className="w-4 h-4 text-teal" /> Saved Locations
                </h3>
                {savedLocationsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : savedLocationSlugs.length === 0 ? (
                  <div className="glass rounded-2xl border border-border p-8 text-center">
                    <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No saved locations yet. Visit a location page and tap "Save City".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {savedLocationSlugs.map((slug, i) => (
                      <motion.div
                        key={slug}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group glass rounded-xl p-4 border border-border flex items-center justify-between"
                      >
                        <Link to={`/location/${slug}`} className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-teal" />
                          </div>
                          <span className="text-sm font-medium text-foreground capitalize truncate">{slug.replace(/-/g, " ")}</span>
                        </Link>
                        <button
                          onClick={() => handleUnsaveLocation(slug)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove from saved"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Saved Spots */}
                <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2 mt-6">
                  <Bookmark className="w-4 h-4 text-amber" /> Saved Spots Wishlist
                </h3>
                {savedSpotsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : savedSpotSlugs.length === 0 ? (
                  <div className="glass rounded-2xl border border-border p-8 text-center">
                    <Bookmark className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No saved spots yet. Open a spot and tap "Save Spot".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedSpotSlugs.map((slug, i) => (
                      <motion.div
                        key={slug}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group glass rounded-xl p-4 border border-border flex items-center justify-between"
                      >
                        <Link to={`/spot/${slug}`} className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-amber/10 flex items-center justify-center">
                            <Bookmark className="w-4 h-4 text-amber" />
                          </div>
                          <span className="text-sm font-medium text-foreground capitalize truncate">{slug.replace(/-/g, " ")}</span>
                        </Link>
                        <button
                          onClick={() => handleUnsaveSpot(slug)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove from wishlist"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Been Here */}
                <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2 mt-6">
                  <MapPin className="w-4 h-4 text-teal" /> Been Here
                </h3>
                {visitedSpotsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : visitedSpotSlugs.length === 0 ? (
                  <div className="glass rounded-2xl border border-border p-8 text-center">
                    <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No visited spots yet. Open a spot and tap "I've Been Here".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visitedSpotSlugs.map((slug, i) => {
                      const persistedSpot = visitedSpots.find((spot) => spot.spot_slug === slug);
                      return (
                        <motion.div
                          key={slug}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="group glass rounded-xl p-4 border border-border flex items-center justify-between"
                        >
                          <Link to={`/spot/${slug}`} className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-teal" />
                            </div>
                            <span className="text-sm font-medium text-foreground capitalize truncate">
                              {persistedSpot ? persistedSpot.spot_name : slug.replace(/-/g, " ")}
                            </span>
                          </Link>
                          <button
                            onClick={() => handleUnvisitSpot(slug)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove from visited"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Watched Titles */}
                <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2 mt-6">
                  <CheckCircle2 className="w-4 h-4 text-teal" /> Watched Titles
                </h3>
                {watchedTitlesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : watchedTitleSlugs.length === 0 ? (
                  <div className="glass rounded-2xl border border-border p-8 text-center">
                    <CheckCircle2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No watched titles yet. Open a title and tap "Watched".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {watchedTitleSlugs.map((slug, i) => (
                      <motion.div
                        key={slug}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass rounded-xl p-4 border border-border flex items-center gap-3 min-w-0"
                      >
                        <Link to={`/title/${slug}`} className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-teal" />
                          </div>
                          <span className="text-sm font-medium text-foreground capitalize truncate">{prettifySlug(slug)}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "posts" && (
              <div>
                {isOwnProfile && (
                  <button
                    onClick={() => setPostOpen(true)}
                    className="w-full glass rounded-2xl border border-dashed border-border p-4 mb-4 flex items-center gap-3 text-left hover:border-amber/60 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center text-amber">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-muted-foreground">Share a scene, memory, or recommendation…</span>
                  </button>
                )}
                {posts.length === 0 ? (
                  <div className="glass rounded-2xl border border-border p-10 text-center">
                    <Grid3X3 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No posts yet.{isOwnProfile && " Tap “Post” to share your first one."}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((p, i) => (
                      <motion.article
                        key={p.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="glass rounded-2xl border border-border overflow-hidden"
                      >
                        {p.image_url && (
                          <img src={p.image_url} alt="" className="w-full max-h-96 object-cover" />
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed flex-1">{p.content}</p>
                            {isOwnProfile && (
                              <button
                                onClick={() => handleDeletePost(p.id)}
                                className="text-muted-foreground hover:text-red-400 transition-colors"
                                title="Delete post"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(p.created_at).toLocaleDateString()}</span>
                            {p.title_slug && (
                              <Link to={`/title/${p.title_slug}`} className="px-2 py-0.5 rounded-full bg-amber/10 text-amber capitalize">
                                {prettifySlug(p.title_slug)}
                              </Link>
                            )}
                            {p.spot_slug && (
                              <Link to={`/spot/${p.spot_slug}`} className="px-2 py-0.5 rounded-full bg-teal/10 text-teal capitalize">
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
              <div className="glass rounded-2xl border border-border p-10 text-center">
                <List className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No lists yet. Curated collections are coming soon — your saved titles, locations and spots already live in the Saved tab.</p>
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
