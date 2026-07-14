import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Bookmark } from "lucide-react";
import { heroSlides, type Title } from "@/lib/mockData";

type HeroBannerProps = {
  titles?: Title[];
};

type HeroSlide = {
  id: string;
  title: string;
  year: number;
  type: Title["type"];
  locationCount: number;
  coverImage?: string;
  image: string;
  imageSrcSet?: string;
  imageDesktopSrcSet?: string;
  imageMobileSrcSet?: string;
  imageSizes?: string;
  imagePosition?: string;
  locationTag: string;
  hookLine: string;
};

function slugifyTitle(title: string, year: number) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").replace(/^-+/, "")}-${year}`;
}

// Curated hook lines by title. Falls back to the location-based template.
const HOOK_LINES: Record<string, string> = {
  "peaky-blinders": "That backstreet is real — cobbles and all — in Digbeth, Birmingham.",
  "bridgerton": "The Bridgerton family home? A working stately manor in Wiltshire, open to visitors.",
  "the-white-lotus": "The infinity pool everyone screenshotted — same edge, same view, in Sicily.",
  "harry-potter": "Diagon Alley's real cobbles are in York — and yes, you can walk them.",
};

function buildHookLine(slide: { title: string; locationTag?: string }): string {
  const key = slide.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (HOOK_LINES[key]) return HOOK_LINES[key];
  if (slide.locationTag) {
    return `Shot in ${slide.locationTag} — and you can stand there.`;
  }
  return "A real place from this story — and you can go.";
}

export default function HeroBanner({ titles = [] }: HeroBannerProps) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const slides = useMemo<HeroSlide[]>(() => {
    if (titles.length > 0) {
      return titles.slice(0, 6).map((title) => ({
        id: `hero-${title.id}`,
        title: title.title,
        year: title.year,
        type: title.type,
        locationCount: title.locationCount,
        coverImage: title.coverImage,
        image: title.heroImage || title.coverImage,
        imageSrcSet: title.heroImageSrcSet,
        imageDesktopSrcSet: title.heroImageDesktopSrcSet || title.heroImageSrcSet,
        imageMobileSrcSet: title.heroImageMobileSrcSet,
        imageSizes: title.heroImageSizes,
        imagePosition: (title as { heroImagePosition?: string }).heroImagePosition,
        locationTag: title.locations?.[0] || "Filming locations",
        hookLine: buildHookLine({ title: title.title, locationTag: title.locations?.[0] }),
      }));
    }
    return heroSlides.map((s) => ({
      ...s,
      locationCount: 0,
      hookLine: buildHookLine({ title: s.title, locationTag: s.locationTag }),
    })) as HeroSlide[];
  }, [titles]);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((c) => (c + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [current, slides.length]);

  const go = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };
  const prev = () => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  };
  const next = () => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
  };

  const slide = slides[current];
  if (!slide) return null;

  const foregroundImagePositionClass =
    slide.type === "Movie"
      ? "object-[center_20%] sm:object-[center_28%] lg:object-center"
      : "object-center";

  return (
    <div className="relative h-[44vh] sm:h-[60vh] min-h-[280px] sm:min-h-[420px] max-h-[720px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-float">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={slide.id}
          custom={direction}
          initial={{ opacity: 0, scale: 1.04, x: direction * 30 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.97, x: -direction * 30 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          <picture>
            {slide.imageMobileSrcSet && (
              <source media="(max-width: 640px)" srcSet={slide.imageMobileSrcSet} sizes="100vw" />
            )}
            {slide.imageDesktopSrcSet && (
              <source
                media="(min-width: 641px)"
                srcSet={slide.imageDesktopSrcSet}
                sizes={slide.imageSizes || "100vw"}
              />
            )}
            <img
              src={slide.image}
              srcSet={slide.imageSrcSet}
              sizes={slide.imageSizes || "100vw"}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-35 pointer-events-none"
            />
          </picture>
          <picture>
            {slide.imageMobileSrcSet && (
              <source media="(max-width: 640px)" srcSet={slide.imageMobileSrcSet} sizes="100vw" />
            )}
            {slide.imageDesktopSrcSet && (
              <source
                media="(min-width: 641px)"
                srcSet={slide.imageDesktopSrcSet}
                sizes={slide.imageSizes || "100vw"}
              />
            )}
            <img
              src={slide.imageMobileSrcSet ? slide.coverImage : slide.image}
              srcSet={slide.imageSrcSet}
              sizes={slide.imageSizes || "100vw"}
              alt={slide.title}
              className={`relative z-10 w-full h-full object-cover ${foregroundImagePositionClass} pointer-events-none select-none`}
              style={slide.imagePosition ? { objectPosition: slide.imagePosition } : undefined}
            />
          </picture>
          {/* Guaranteed contrast scrim — always applied, regardless of poster art. */}
          <div className="absolute inset-x-0 bottom-0 h-[55%] z-10 bg-gradient-to-t from-[#14100D] via-[#14100D]/75 to-transparent" />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#14100D]/60 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 sm:p-10 text-overlay-foreground">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id + "-content"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="max-w-2xl"
          >
            {/* metadata row */}
            <div className="inline-flex items-center gap-2 mb-3 sm:mb-5 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 sm:px-3 sm:py-1.5">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white">
                {slide.type}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span className="text-[10px] sm:text-[11px] font-mono text-white/85">{slide.year}</span>
            </div>

            {/* title */}
            <h1 className="font-serif italic text-2xl sm:text-6xl leading-[1.05] text-[#F6EFE2] mb-2 sm:mb-5 max-w-[18ch]">
              {slide.title}
            </h1>

            {/* hook line */}
            <p className="text-xs sm:text-base text-[#F6EFE2]/85 leading-snug sm:leading-relaxed mb-4 sm:mb-7 max-w-[42ch] line-clamp-2 sm:line-clamp-none">
              {slide.hookLine}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => {
                  navigate(`/title/${slugifyTitle(slide.title, slide.year)}`, {
                    state: {
                      title: slide.title,
                      year: slide.year,
                      type: slide.type,
                      locationCount: slide.locationCount,
                    },
                  });
                }}
                className="inline-flex items-center h-9 sm:h-11 px-3.5 sm:px-5 rounded-full bg-gold-deep text-charcoal font-semibold text-xs sm:text-sm hover:brightness-105 transition shadow-lg shadow-black/40"
              >
                Find where this was filmed
              </button>
              <button
                onClick={() => {
                  navigate(`/title/${slugifyTitle(slide.title, slide.year)}`, {
                    state: {
                      title: slide.title,
                      year: slide.year,
                      type: slide.type,
                      locationCount: slide.locationCount,
                      autoSave: true,
                    },
                  });
                }}
                className="inline-flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-3.5 sm:px-5 rounded-full border border-[#E8A24A]/60 text-[#F6D9A8] font-medium text-xs sm:text-sm hover:bg-[#E8A24A]/10 transition"
              >
                <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Save
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav arrows (desktop/tablet only — dots + autoplay handle mobile navigation) */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="hidden sm:flex absolute z-30 left-3 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur items-center justify-center text-white/90 hover:bg-black/60 transition"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="hidden sm:flex absolute z-30 right-3 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur items-center justify-center text-white/90 hover:bg-black/60 transition"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute z-30 bottom-4 right-5 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 h-1.5 bg-[#F4C77B]"
                : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
