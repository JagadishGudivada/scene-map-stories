import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Bookmark, CheckCircle2, Heart, Grid3X3, List, Users, Settings, Share2, X } from "lucide-react";
import LeafletMap from "@/components/LeafletMap";
import { useAllSavedTitles, useAllSavedLocations, useAllSavedSpots, useAllVisitedSpots, useAllWatchedTitles } from "@/hooks/useSaved";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Tab = "map" | "saved" | "posts" | "lists";

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
  const { user: authUser } = useAuth();
  const { username: routeUsername } = useParams<{ username: string }>();
  const { toast } = useToast();
  const { slugs: savedTitleSlugs, loading: savedTitlesLoading, refresh: refreshTitles } = useAllSavedTitles();
  const { slugs: savedLocationSlugs, loading: savedLocationsLoading, refresh: refreshLocations } = useAllSavedLocations();
  const { slugs: savedSpotSlugs, loading: savedSpotsLoading, refresh: refreshSavedSpots } = useAllSavedSpots();
  const { slugs: visitedSpotSlugs, spots: visitedSpots, loading: visitedSpotsLoading, refresh: refreshVisitedSpots } = useAllVisitedSpots();
  const { slugs: watchedTitleSlugs, loading: watchedTitlesLoading } = useAllWatchedTitles();

  // Derive real user identity from auth metadata
  const meta = (authUser?.user_metadata ?? {}) as Record<string, any>;
  const displayName: string =
    meta.full_name || meta.name || meta.user_name || authUser?.email?.split("@")[0] || "Your Profile";
  const username: string =
    routeUsername || meta.user_name || meta.preferred_username || authUser?.email?.split("@")[0] || "you";
  const avatarUrl: string | undefined = meta.avatar_url || meta.picture;
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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

  const stats = [
    { label: "Titles Saved", value: savedTitleSlugs.length, icon: Bookmark, color: "text-amber" },
    { label: "Spots Visited", value: visitedSpotSlugs.length, icon: MapPin, color: "text-teal" },
    { label: "Countries", value: visitedCountriesCount, icon: Users, color: "text-foreground" },
    { label: "Watched", value: watchedTitleSlugs.length, icon: Heart, color: "text-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Cover */}
      <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-gradient-to-br from-amber/20 via-background to-teal/20">
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="h-9 px-4 rounded-xl glass border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              <Link
                to="/auth"
                className="h-9 w-9 rounded-xl glass border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Account settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {authUser?.email && (
            <div className="mt-4 flex items-center gap-1.5 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4 text-amber" />
              <span>{authUser.email}</span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-0 mt-5 glass rounded-2xl border border-border divide-x divide-border overflow-hidden">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex-1 flex flex-col items-center py-4 px-2 hover:bg-muted/50 transition-colors"
              >
                <stat.icon className={`w-4 h-4 mb-1.5 ${stat.color}`} />
                <span className={`text-xl font-bold font-serif ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-muted-foreground mt-0.5 text-center leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
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
              <div className="glass rounded-2xl border border-border p-10 text-center">
                <Grid3X3 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No posts yet. Sharing your scene photos and trip notes is coming soon.</p>
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
    </div>
  );
}
