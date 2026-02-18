import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Bookmark, Heart, Grid3X3, List, Users, Settings, Share2 } from "lucide-react";
import { mockUser, mockTitles, mockPosts } from "@/lib/mockData";
import CinemaCard from "@/components/CinemaCard";
import PostCard from "@/components/PostCard";
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

// Simple map placeholder (Leaflet/Mapbox would go here)
function MapPlaceholder() {
  const pins = [
    { x: "22%", y: "38%", label: "London", color: "bg-teal" },
    { x: "28%", y: "36%", label: "Paris", color: "bg-amber" },
    { x: "34%", y: "38%", label: "Rome", color: "bg-amber" },
    { x: "72%", y: "40%", label: "Tokyo", color: "bg-teal" },
    { x: "15%", y: "45%", label: "NYC", color: "bg-amber" },
    { x: "38%", y: "52%", label: "Santorini", color: "bg-amber" },
  ];

  return (
    <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-white/10 bg-card">
      {/* World map grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          opacity: 0.4,
        }}
      />
      {/* Ambient glow areas (fake continents) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <div className="w-full h-full bg-teal rounded-full blur-3xl scale-50 translate-x-8" />
      </div>

      {/* Map label */}
      <div className="absolute top-4 left-4">
        <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 border border-white/10">
          <MapPin className="w-4 h-4 text-amber" />
          <span className="text-xs font-medium text-foreground">{mockUser.locationsMapped} locations mapped</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 glass rounded-xl px-3 py-2 border border-white/10">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber" />
            <span className="text-xs text-muted-foreground">Movie</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal" />
            <span className="text-xs text-muted-foreground">Series</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(270 60% 70%)" }} />
            <span className="text-xs text-muted-foreground">Book</span>
          </div>
        </div>
      </div>

      {/* Pins */}
      {pins.map((pin) => (
        <motion.div
          key={pin.label}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: Math.random() * 0.4 }}
          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          style={{ left: pin.x, top: pin.y }}
        >
          <div className={`w-4 h-4 rounded-full ${pin.color} opacity-80 shadow-amber animate-pulse-amber border-2 border-background`} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 glass rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
            <span className="text-xs font-medium text-foreground">{pin.label}</span>
          </div>
        </motion.div>
      ))}

      {/* "Connect Mapbox" hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <span className="glass rounded-full px-4 py-2 text-xs text-muted-foreground border border-white/10">
          Interactive map · Connect Mapbox for full experience
        </span>
      </div>
    </div>
  );
}

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
                    ? "glass border border-white/10 text-foreground hover:border-red-400/30 hover:text-red-400"
                    : "bg-gradient-amber text-charcoal hover:opacity-90 shadow-amber"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
              <button className="h-9 w-9 rounded-xl glass border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="h-9 w-9 rounded-xl glass border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
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
          <div className="flex items-center gap-0 mt-5 glass rounded-2xl border border-white/8 divide-x divide-white/5 overflow-hidden">
            {[
              { label: "Titles Saved", value: user.titlesSaved, icon: Bookmark, color: "text-amber" },
              { label: "Locations", value: user.locationsMapped, icon: MapPin, color: "text-teal" },
              { label: "Followers", value: formatNum(user.followers), icon: Users, color: "text-foreground" },
              { label: "Following", value: user.following, icon: Heart, color: "text-foreground" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 flex flex-col items-center py-4 px-2 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <stat.icon className={`w-4 h-4 mb-1.5 ${stat.color}`} />
                <span className={`text-xl font-bold font-serif ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-muted-foreground mt-0.5 text-center leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 mb-6 overflow-x-auto no-scrollbar">
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
                <MapPlaceholder />
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mockTitles.slice(0, 3).map((t, i) => (
                    <div key={t.id} className="glass rounded-xl p-3 border border-white/8 flex items-center gap-3">
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
