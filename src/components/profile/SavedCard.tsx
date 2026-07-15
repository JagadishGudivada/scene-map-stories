import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { X } from "lucide-react";
import { fetchPexelsImage } from "@/lib/pexels";

export type SavedCardItem = {
  slug: string;
  label: string;
  href: string;
  accent: "amber" | "teal";
  icon: React.ComponentType<{ className?: string }>;
  onUnsave?: (s: string) => void;
  query?: string;
  imageUrl?: string;
  imageFit?: "cover" | "poster";
};

export default function SavedCard({ item, index }: { item: SavedCardItem; index: number }) {
  const Icon = item.icon;
  const accentBg = item.accent === "amber" ? "bg-amber/15" : "bg-teal/15";
  const accentText = item.accent === "amber" ? "text-amber" : "text-teal";
  const [image, setImage] = useState<string | null>(item.imageUrl || null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [hovered, setHovered] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 200, damping: 20 });
  const shimmerX = useTransform(mx, [0, 1], ["-20%", "120%"]);
  const shimmerY = useTransform(my, [0, 1], ["-20%", "120%"]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  const handleLeave = () => {
    mx.set(0.5);
    my.set(0.5);
    setHovered(false);
  };

  useEffect(() => {
    if (item.imageUrl) {
      setImage(item.imageUrl);
      setStatus("loading");
      return;
    }
    let cancelled = false;
    const q = (item.query || item.label).trim();
    if (!q) {
      setStatus("error");
      return;
    }
    fetchPexelsImage(q)
      .then((url) => {
        if (cancelled) return;
        if (url) {
          setImage(url);
          setStatus("loading");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [item.query, item.label, item.imageUrl]);

  const showImage = image && status !== "error";

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
      }}
      className="group relative rounded-2xl border border-white/[0.06] aspect-square overflow-hidden bg-[#121212]/70 backdrop-blur-xl shadow-[0_10px_40px_-16px_rgba(0,0,0,0.7)] will-change-transform"
    >
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5" />
      )}

      {!showImage && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            item.accent === "amber"
              ? "bg-gradient-to-br from-amber/25 via-[#0a0a0a] to-[#0a0a0a]"
              : "bg-gradient-to-br from-teal/25 via-[#0a0a0a] to-[#0a0a0a]"
          }`}
          aria-hidden
        >
          <Icon className={`w-12 h-12 ${accentText} opacity-30`} />
        </div>
      )}

      {showImage && item.imageFit === "poster" && (
        <img
          src={image!}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
          onError={() => setStatus("error")}
        />
      )}
      {showImage && (
        <img
          src={image!}
          alt={item.label}
          loading="lazy"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`absolute inset-0 w-full h-full ${
            item.imageFit === "poster" ? "object-contain" : "object-cover"
          } group-hover:scale-[1.06] transition-transform duration-700 ease-out ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Bottom scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

      {/* Mouse-tracked shimmer overlay */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: hovered
            ? `radial-gradient(circle at ${shimmerX.get()} ${shimmerY.get()}, rgba(255,184,0,0.18), transparent 55%)`
            : undefined,
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)",
            x: useTransform(mx, [0, 1], ["-40%", "40%"]),
          }}
        />
      </motion.div>

      <Link to={item.href} className="absolute inset-0 z-10" aria-label={item.label} />

      <div className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-xl ${accentBg} ${accentText} backdrop-blur-md flex items-center justify-center border border-white/10`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 space-y-1" style={{ transform: "translateZ(30px)" }}>
        <span className="block text-sm font-medium text-white capitalize leading-snug line-clamp-2 group-hover:text-amber transition-colors">
          {item.label}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
          {item.accent === "amber" ? "Saved" : "Visited"}
        </span>
      </div>

      {item.onUnsave && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); item.onUnsave!(item.slug); }}
          className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-black/70 backdrop-blur flex items-center justify-center text-white/60 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
          title="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
