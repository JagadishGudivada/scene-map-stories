import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Film, Share2, Volume2, VolumeX } from "lucide-react";
import "flag-icons/css/flag-icons.min.css";
import type { VisitedSpotRow } from "@/hooks/useSaved";
import { countryToIso2 } from "@/lib/countryIso";
import { getTier } from "@/lib/tiers";
import { shareOrDownloadCard } from "@/lib/shareCard";

type Chapter = {
  country: string;
  iso2: string | null;
  spots: VisitedSpotRow[];
  firstAt: number;
  lastAt: number;
};

const CHAPTER_MS = 3800;

const typeDot: Record<VisitedSpotRow["type"], string> = {
  Movie: "bg-amber",
  Series: "bg-teal",
  Book: "bg-[#B08968]",
};

function fmtRange(firstAt: number, lastAt: number) {
  const f = new Date(firstAt);
  const l = new Date(lastAt);
  const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
  const a = f.toLocaleDateString(undefined, opts);
  const b = l.toLocaleDateString(undefined, opts);
  return a === b ? `Added ${a}` : `Added ${a} — ${b}`;
}

export default function MemoryLane({
  open,
  onClose,
  spots,
  displayName,
  tierCount,
}: {
  open: boolean;
  onClose: () => void;
  spots: VisitedSpotRow[];
  displayName?: string;
  tierCount: number;
}) {
  const chapters = useMemo<Chapter[]>(() => {
    const byCountry = new Map<string, VisitedSpotRow[]>();
    for (const s of spots) {
      const key = (s.country || "Unknown").trim();
      if (!byCountry.has(key)) byCountry.set(key, []);
      byCountry.get(key)!.push(s);
    }
    const list: Chapter[] = [];
    byCountry.forEach((entries, country) => {
      const times = entries
        .map((e) => (e.created_at ? new Date(e.created_at).getTime() : 0))
        .filter((t) => t > 0);
      const firstAt = times.length ? Math.min(...times) : 0;
      const lastAt = times.length ? Math.max(...times) : 0;
      list.push({
        country,
        iso2: countryToIso2(country),
        spots: entries
          .slice()
          .sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return ta - tb;
          })
          .slice(0, 8),
        firstAt,
        lastAt,
      });
    });
    list.sort((a, b) => a.firstAt - b.firstAt);
    return list;
  }, [spots]);

  const total = chapters.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const finalRef = useRef<HTMLDivElement>(null);

  // total pages: chapters + final recap
  const showFinal = index >= total;

  // Reset when opening/closing
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setPaused(false);
    setProgress(0);
    elapsedRef.current = 0;
    startRef.current = performance.now();
  }, [open]);

  // Advance loop
  useEffect(() => {
    if (!open || showFinal) return;
    startRef.current = performance.now();
    elapsedRef.current = 0;

    const tick = (now: number) => {
      if (paused) {
        startRef.current = now - elapsedRef.current;
      } else {
        elapsedRef.current = now - startRef.current;
      }
      const p = Math.min(1, elapsedRef.current / CHAPTER_MS);
      setProgress(p);
      if (p >= 1) {
        setIndex((i) => i + 1);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, index, paused, showFinal]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, total));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, total, onClose]);

  if (!open) return null;

  const chapter = chapters[index];
  const countries = chapters.length;
  const locations = spots.length;
  const tier = getTier(tierCount);
  const TierIcon = tier.icon;

  const handleTapNav = (side: "left" | "right") => {
    if (side === "left") setIndex((i) => Math.max(0, i - 1));
    else setIndex((i) => Math.min(total, i + 1));
  };

  const handleShare = async () => {
    if (finalRef.current) await shareOrDownloadCard(finalRef.current, "sarevista-journey.png");
  };

  return (
    <AnimatePresence>
      <motion.div
        key="memory-lane"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] bg-black text-white select-none"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* film grain / vignette */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)" }}
        />

        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
          {Array.from({ length: Math.max(1, total) + 1 }).map((_, i) => {
            const filled = i < index ? 1 : i === index ? (showFinal ? 1 : progress) : 0;
            return (
              <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber transition-[width] duration-100"
                  style={{ width: `${filled * 100}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-6 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tap zones */}
        <button
          className="absolute inset-y-0 left-0 w-1/3 z-10"
          aria-label="Previous"
          onClick={(e) => { e.stopPropagation(); handleTapNav("left"); }}
        />
        <button
          className="absolute inset-y-0 right-0 w-1/3 z-10"
          aria-label="Next"
          onClick={(e) => { e.stopPropagation(); handleTapNav("right"); }}
        />

        <div className="absolute inset-0 flex items-center justify-center px-6 py-16">
          <AnimatePresence mode="wait">
            {!showFinal && chapter && (
              <motion.div
                key={`chapter-${index}`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full max-w-md mx-auto flex flex-col items-center text-center"
              >
                {/* Flag */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className="w-32 h-32 rounded-full overflow-hidden border-2 border-amber shadow-[0_0_40px_rgba(244,199,123,0.35)] bg-black/40 flex items-center justify-center"
                >
                  {chapter.iso2 ? (
                    <span
                      className={`fi fi-${chapter.iso2}`}
                      style={{
                        width: "180%",
                        height: "180%",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                      aria-label={chapter.country}
                    />
                  ) : (
                    <Film className="w-10 h-10 text-amber/70" />
                  )}
                </motion.div>

                {/* Country name */}
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className="mt-6 text-4xl md:text-5xl italic tracking-wide text-amber"
                  style={{ fontFamily: "'Lora', 'Instrument Serif', serif" }}
                >
                  {chapter.country.toUpperCase()}
                </motion.h2>

                {chapter.firstAt > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/60"
                  >
                    {fmtRange(chapter.firstAt, chapter.lastAt).toUpperCase()}
                  </motion.div>
                )}

                {/* Locations list */}
                <div className="mt-8 w-full space-y-2.5">
                  {chapter.spots.map((s, i) => (
                    <motion.div
                      key={s.spot_slug}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.17, duration: 0.35 }}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${typeDot[s.type]}`} />
                      <div className="min-w-0 text-left flex-1">
                        <div className="text-sm text-white truncate">{s.spot_name}</div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-white/50 truncate">
                          {s.city}{s.type ? ` · ${s.type}` : ""}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {showFinal && (
              <motion.div
                key="final"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md mx-auto flex flex-col items-center text-center"
              >
                <div
                  ref={finalRef}
                  className="w-full rounded-3xl p-8 bg-gradient-to-br from-[#1a1410] via-black to-[#0D0D0D] border border-amber/30"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber/80">
                    Sarevista · Memory Lane
                  </div>
                  <h3
                    className="mt-3 text-3xl md:text-4xl italic text-amber"
                    style={{ fontFamily: "'Lora', 'Instrument Serif', serif" }}
                  >
                    {displayName ? `${displayName}'s Journey` : "Your Journey"}
                  </h3>
                  <div className="mt-8 flex items-center justify-center gap-8">
                    <div>
                      <div className="text-4xl font-semibold text-white">{locations}</div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-white/60 mt-1">
                        Locations
                      </div>
                    </div>
                    <div className="w-px h-10 bg-white/15" />
                    <div>
                      <div className="text-4xl font-semibold text-white">{countries}</div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-white/60 mt-1">
                        Countries
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber/40 bg-amber/10 text-amber">
                    <TierIcon className="w-4 h-4" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{tier.label}</span>
                  </div>
                </div>

                <button
                  onClick={handleShare}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber text-black font-medium hover:brightness-105 transition"
                >
                  <Share2 className="w-4 h-4" />
                  Share Journey
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
