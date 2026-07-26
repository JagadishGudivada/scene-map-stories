import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Clapperboard } from "lucide-react";
import { useTitleTrailers, type TitleVideo } from "@/hooks/useTitleTrailers";

export default function TrailerSection({
  slug,
  title,
  year,
  type,
  tmdbId,
  cached,
}: {
  slug?: string;
  title?: string;
  year?: number;
  type?: "Movie" | "Series" | "Book";
  tmdbId?: number;
  cached?: TitleVideo[];
}) {
  const { videos, loading } = useTitleTrailers({ slug, title, year, type, tmdbId, cached });
  const [activeKey, setActiveKey] = useState<string | null>(null);

  if (type === "Book") return null;
  if (!loading && videos.length === 0) return null;

  const primary = videos[0];
  const rest = videos.slice(1);
  const playing = activeKey ?? null;

  return (
    <section className="mb-10 sm:mb-12" aria-labelledby="trailers-heading">
      <div className="flex items-baseline gap-3 mb-3 sm:mb-4">
        <h2 id="trailers-heading" className="font-serif text-xl sm:text-2xl text-foreground">
          Watch it first
        </h2>
        <span className="text-[10px] sm:text-[11px] text-muted-foreground">
          Trailers &amp; teasers
        </span>
      </div>

      {loading && videos.length === 0 ? (
        <div className="aspect-video w-full rounded-2xl border border-border/60 bg-card/60 animate-pulse" />
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45 }}
            className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border/60 bg-charcoal"
          >
            {playing ? (
              <iframe
                key={playing}
                src={`https://www.youtube-nocookie.com/embed/${playing}?autoplay=1&rel=0`}
                title={videos.find((v) => v.key === playing)?.name || "Trailer"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setActiveKey(primary.key)}
                className="group absolute inset-0 w-full h-full"
                aria-label={`Play ${primary.name}`}
              >
                <img
                  src={`https://img.youtube.com/vi/${primary.key}/hqdefault.jpg`}
                  alt={`${title || "Title"} trailer thumbnail`}
                  loading="lazy"
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-amber text-charcoal flex items-center justify-center shadow-float group-hover:scale-105 transition-transform">
                    <Play className="w-6 h-6 translate-x-[1px]" fill="currentColor" />
                  </span>
                </span>
                <span className="absolute left-4 bottom-4 right-4 text-left">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber flex items-center gap-1.5 mb-1">
                    <Clapperboard className="w-3 h-3" /> {primary.type}
                  </span>
                  <span className="block font-serif text-base sm:text-lg text-white/95 line-clamp-1">
                    {primary.name}
                  </span>
                </span>
              </button>
            )}
          </motion.div>

          {rest.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {rest.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setActiveKey(v.key)}
                  className={`shrink-0 w-40 text-left rounded-xl overflow-hidden border transition-colors ${
                    playing === v.key ? "border-amber/60" : "border-border/60 hover:border-amber/40"
                  }`}
                >
                  <img
                    src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`}
                    alt={v.name}
                    loading="lazy"
                    className="w-full aspect-video object-cover"
                  />
                  <span className="block px-2 py-1.5 text-[11px] text-foreground/80 line-clamp-1">
                    {v.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
