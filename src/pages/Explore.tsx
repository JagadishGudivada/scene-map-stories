import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, MapPin, Film, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";

type PostRow = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  location_slug: string | null;
  title_slug: string | null;
  spot_slug: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Explore() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: postData, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({ title: "Failed to load posts", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows = (postData || []) as PostRow[];
    setPosts(rows);

    const userIds = Array.from(new Set(rows.map((p) => p.user_id)));
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      const map: Record<string, ProfileRow> = {};
      (profileData || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("posts").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Post deleted" });
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Seo
        title="Explore — Community Posts & Filming Trails"
        description="Browse community-shared filming locations, scene visits, and travel notes from movies, series, and books around the world."
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-5 h-5 text-amber" />
            <h1 className="font-serif text-4xl text-foreground">Explore</h1>
          </div>
          <p className="text-muted-foreground text-sm">Latest memories shared by the community</p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-amber animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl border border-border">
            <p className="text-muted-foreground text-sm">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post, i) => {
              const profile = profiles[post.user_id];
              const displayName = profile?.display_name || profile?.username || "Anonymous";
              const username = profile?.username || "user";
              const avatar = profile?.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${post.user_id}`;
              const isOwn = user?.id === post.user_id;

              return (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-2xl overflow-hidden bg-card border border-border shadow-card"
                >
                  <div className="flex items-center gap-3 p-4">
                    <Link to={`/u/${username}`} className="shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden amber-ring">
                        <img src={avatar} alt={displayName} className="w-full h-full object-cover bg-muted" />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/u/${username}`} className="font-semibold text-sm text-foreground hover:text-amber transition-colors">
                        {displayName}
                      </Link>
                      <p className="text-xs text-muted-foreground">@{username} · {timeAgo(post.created_at)}</p>
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {post.image_url && (
                    <div className="relative overflow-hidden bg-muted">
                      <img src={post.image_url} alt={post.content.slice(0, 60)} className="w-full max-h-[600px] object-cover" />
                      {post.location_slug && (
                        <div className="absolute bottom-3 left-3">
                          <Link to={`/location/${post.location_slug}`} className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-amber/10 transition-colors">
                            <MapPin className="w-3 h-3 text-amber" />
                            <span className="text-xs font-medium text-foreground">{post.location_slug.replace(/-/g, " ")}</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="px-4 py-3">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      {post.location_slug && !post.image_url && (
                        <Link to={`/location/${post.location_slug}`} className="flex items-center gap-1.5 text-xs text-amber hover:underline">
                          <MapPin className="w-3 h-3" />
                          {post.location_slug.replace(/-/g, " ")}
                        </Link>
                      )}
                      {post.title_slug && (
                        <Link to={`/title/${post.title_slug}`} className="flex items-center gap-1.5 text-xs text-teal hover:underline">
                          <Film className="w-3 h-3" />
                          {post.title_slug.replace(/-/g, " ")}
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
