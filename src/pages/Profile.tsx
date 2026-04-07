import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Bookmark, Heart, Grid3X3, List, Users, Settings, Share2, X } from "lucide-react";
import { mockUser, mockTitles, mockPosts } from "@/lib/mockData";
import { allMapPins } from "@/lib/mapData";
import CinemaCard from "@/components/CinemaCard";
import PostCard from "@/components/PostCard";
import LeafletMap from "@/components/LeafletMap";
import { useAllSavedTitles, useAllSavedLocations } from "@/hooks/useSaved";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import coverImg from "@/assets/cover-paris.jpg";

type Tab = "map" | "saved" | "posts" | "lists";

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "map", label: "Memory Map", icon: MapPin },
  { id: "saved", label: "Saved Titles", icon: Bookmark },
  { id: "posts", label: "Posts", icon: Grid3X3 },
  { id: "lists", label: "Lists", icon: List },
];

const mockLists = [
  { id: "l1", name: "Italian Cinema Spots", count: 12, coverImage: coverImg, emoji: "🇮🇹" },
  { id: "l2", name: "Netflix Korea Locations", count: 8, coverImage: mockTitles[0].coverImage, emoji: "🇰🇷" },
  { id: "l3", name: "Classics of Hollywood", count: 21, coverImage: mockTitles[1].coverImage, emoji: "🎬" },
  { id: "l4", name: "Books I Want to Visit", count: 6, coverImage: mockTitles[2].coverImage, emoji: "📚" },
];

// MapPlaceholder replaced by LeafletMap
export default function Profile() {
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [following, setFollowing] = useState(false);
  const user = mockUser;

  const formatNum = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Cover Photo */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden">
        <img src={coverImg} alt="Cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Profile Header */}
        <div className="-mt-16 relative z-10 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            {/* Avatar + Name */}
            <div className="flex items-end gap-4">
              <div className="w-28 h-28 rounded-full overflow-hidden amber-ring border-4 border-background shrink-0 shadow-float">
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-full h-full object-cover bg-muted"
                />
              </div>
              <div className="pb-1">
                <h1 className="font-serif text-2xl text-foreground leading-tight">{user.displayName}</h1>
                <p className="text-muted-foreground text-sm">@{user.username}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFollowing(!following)}
                className={`h-9 px-5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  following
                    ? "glass border border-border text-foreground hover:border-red-400/30 hover:text-red-400"
                    : "bg-gradient-amber text-charcoal hover:opacity-90 shadow-amber"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
              <button className="h-9 w-9 rounded-xl glass border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="h-9 w-9 rounded-xl glass border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bio */}
          <div className="mt-4 space-y-2">
            <p className="text-foreground text-sm leading-relaxed max-w-lg">{user.bio}</p>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4 text-amber" />
              <span>{user.location}</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-0 mt-5 glass rounded-2xl border border-border divide-x divide-border overflow-hidden">
            {[
              { label: "Titles Saved", value: user.titlesSaved, icon: Bookmark, color: "text-amber" },
              { label: "Locations", value: user.locationsMapped, icon: MapPin, color: "text-teal" },
              { label: "Followers", value: formatNum(user.followers), icon: Users, color: "text-foreground" },
              { label: "Following", value: user.following, icon: Heart, color: "text-foreground" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 flex flex-col items-center py-4 px-2 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <stat.icon className={`w-4 h-4 mb-1.5 ${stat.color}`} />
                <span className={`text-xl font-bold font-serif ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-muted-foreground mt-0.5 text-center leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
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

        {/* Tab Content */}
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
                  {user.locationsMapped} locations pinned across {Math.floor(user.locationsMapped / 5)} countries
                </p>
                <LeafletMap pins={allMapPins} className="h-80" />
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mockTitles.slice(0, 3).map((t, i) => (
                    <div key={t.id} className="glass rounded-xl p-3 border border-border flex items-center gap-3">
                      <img src={t.coverImage} className="w-10 h-10 rounded-lg object-cover" alt={t.title} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{t.title}</p>
                        <p className="text-xs text-teal">{t.locationCount} pins</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "saved" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {mockTitles.map((title, i) => (
                  <CinemaCard key={title.id} title={title} size="md" delay={i * 0.06} />
                ))}
              </div>
            )}

            {activeTab === "posts" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {mockPosts.map((post, i) => (
                  <PostCard key={post.id} post={post} delay={i * 0.08} />
                ))}
              </div>
            )}

            {activeTab === "lists" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mockLists.map((list, i) => (
                  <motion.div
                    key={list.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="group relative h-36 rounded-2xl overflow-hidden cursor-pointer shadow-card"
                  >
                    <img src={list.coverImage} alt={list.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{list.emoji}</span>
                        <div>
                          <h3 className="font-serif text-sm text-foreground">{list.name}</h3>
                          <p className="text-xs text-muted-foreground">{list.count} titles</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
