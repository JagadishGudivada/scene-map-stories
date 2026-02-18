import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Bookmark, Share2, MapPin, Film } from "lucide-react";
import type { Post } from "@/lib/mockData";

interface PostCardProps {
  post: Post;
  delay?: number;
}

export default function PostCard({ post, delay = 0 }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(post.saved);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl overflow-hidden bg-card border border-white/5 shadow-card"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-full overflow-hidden amber-ring shrink-0">
          <img src={post.user.avatar} alt={post.user.displayName} className="w-full h-full object-cover bg-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">{post.user.displayName}</p>
          <p className="text-xs text-muted-foreground">@{post.user.username} · {post.timeAgo}</p>
        </div>
        <button className="text-xs font-semibold text-amber px-3 py-1.5 rounded-full border border-amber/30 hover:bg-amber/10 transition-colors">
          Follow
        </button>
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={post.image}
          alt={post.caption}
          className="w-full h-full object-cover"
        />
        {/* Location overlay */}
        <div className="absolute bottom-3 left-3">
          <div className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-amber" />
            <span className="text-xs font-medium text-foreground">{post.locationTag}</span>
          </div>
        </div>
      </div>

      {/* Engagement Row */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-white/5">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            liked ? "text-red-400 bg-red-400/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
          <span>{formatCount(likeCount)}</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments}</span>
        </button>
        <button
          onClick={() => setSaved(!saved)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ml-auto ${
            saved ? "text-amber bg-amber/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <Bookmark className="w-4 h-4" fill={saved ? "currentColor" : "none"} />
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Caption */}
      <div className="px-4 py-3">
        <p className="text-sm text-foreground leading-relaxed mb-2">{post.caption}</p>
        <div className="flex items-center gap-1.5">
          <Film className="w-3 h-3 text-teal" />
          <span className="text-xs text-teal font-medium">{post.titleTag}</span>
        </div>
      </div>
    </motion.div>
  );
}
