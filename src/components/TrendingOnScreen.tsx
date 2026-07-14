import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Flame } from "lucide-react";
import { TRENDING_ON_SCREEN, type TrendingSpot } from "@/lib/trendingOnScreen";
import { usePexelsImage } from "@/hooks/usePexelsImage";
import "flag-icons/css/flag-icons.min.css";

const currentYear = new Date().getFullYear();

function TrendingCard({ s, i }: { s: TrendingSpot; i: number }) {
  const navigate = useNavigate();
  const src = usePexelsImage(s.venueName, s.city, undefined, s.image);
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(i, 4) * 0.05 }}
      className="group flex flex-col rounded-3xl overflow-hidden border border-border/60 bg-card/60"
    >
      <div className="scrim-bottom relative aspect-[16/10] overflow-hidden">
        <img
          src={src || s.image}
          alt={`${s.venueName}, ${s.city}`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-black/55 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white/95">
            {s.venueType}
          </span>
          {s.viral && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-deep px-2.5 py-1 text-[11px] font-semibold text-charcoal">
              <Flame className="w-3 h-3" /> Viral
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-2 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 text-[11px] text-white/95">
          <span className={`fi fi-${s.countryIso2} rounded-sm overflow-hidden`} style={{ width: 16, height: 12 }} />
          <span className="font-medium">{s.city}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:gap-3 p-4 sm:p-5">
        <h3 className="font-serif italic text-lg sm:text-2xl text-foreground leading-tight">
          {s.venueName}
        </h3>
        <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.2em] uppercase text-gold-soft">
          As seen in · <span className="text-foreground/85 normal-case tracking-normal font-sans not-italic">{s.asSeenIn}</span> <span className="text-muted-foreground">({s.year})</span>
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">
          {s.sceneLine}
        </p>
        <div className="flex items-center justify-between gap-2 mt-0.5 sm:mt-1">
          <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-medium text-foreground/85">
            {s.hashtag}
          </span>
          <button
            onClick={() => navigate(`/map?search=${encodeURIComponent(s.mapQuery)}`)}
            className="inline-flex items-center h-8 sm:h-9 px-3 sm:px-4 rounded-full bg-gold-deep text-charcoal text-xs sm:text-sm font-semibold hover:brightness-105 transition"
          >
            Plan a visit
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default function TrendingOnScreen() {
  return (
    <section className="mb-10 sm:mb-16" aria-labelledby="trending-heading">
      <div className="mb-3 sm:mb-5">
        <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.24em] uppercase text-gold-soft mb-1.5 sm:mb-2">
          Trending on-screen · {currentYear - 1}–{currentYear}
        </p>
        <h2 id="trending-heading" className="font-serif italic text-xl sm:text-4xl text-foreground leading-tight">
          Cafés & spots from this year's hits
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {TRENDING_ON_SCREEN.map((s, i) => (
          <TrendingCard key={s.id} s={s} i={i} />
        ))}
      </div>
    </section>
  );
}
