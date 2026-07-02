import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlides, type Title } from "@/lib/mockData";

const typeBadgeClass: Record<string, string> = {
  Movie: "badge-movie",
  Series: "badge-series",
  Book: "badge-book",
};

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
  tagline: string;
};

function slugifyTitle(title: string, year: number) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").replace(/^-+/, "")}-${year}`;
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
        tagline: `${title.locationCount} filming locations discovered`,
      }));
    }

    return heroSlides.map((s) => ({ ...s, locationCount: 0 })) as HeroSlide[];
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
    if (current >= slides.length) {
      setCurrent(0);
    }
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
  const foregroundImagePositionClass = slide.type === "Movie"
    ? "object-[center_20%] sm:object-[center_28%] lg:object-center"
    : "object-center";

  if (!slide) return null;

  return (
    <div className="relative h-[48vh] sm:h-[55vh] min-h-[300px] sm:min-h-[380px] max-h-[640px] rounded-2xl overflow-hidden shadow-float">
      {/* Background Slides */}
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
              <source media="(min-width: 641px)" srcSet={slide.imageDesktopSrcSet} sizes={slide.imageSizes || "100vw"} />
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
              <source media="(min-width: 641px)" srcSet={slide.imageDesktopSrcSet} sizes={slide.imageSizes || "100vw"} />
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
          {/* Gradient layers */}
          <div className="absolute inset-0 bg-gradient-to-t from-overlay/80 via-overlay/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-overlay/90 via-overlay/50 to-transparent" />
          {/* Grain */}
          <div
            className="absolute inset-0 opacity-25 mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-10 text-overlay-foreground">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id + "-content"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-prose"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeClass[slide.type]}`}>
                {slide.type}
              </span>
              <span className="text-xs text-overlay-foreground/70">{slide.year}</span>
            </div>

            <h1 className="hidden sm:block font-serif text-4xl sm:text-5xl mb-2 leading-tight">
              {slide.title}
            </h1>

            <div className="hidden sm:flex flex-wrap items-center gap-2 mb-5">
              <MapPin className="w-4 h-4 text-amber" />
              <span className="text-overlay-foreground/70 text-sm">{slide.locationTag}</span>
              <span className="text-overlay-foreground/40">·</span>
              <span className="text-amber text-sm font-medium">{slide.tagline}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                className="px-5 py-2.5 rounded-xl bg-gradient-amber text-charcoal font-semibold text-sm hover:opacity-90 transition-opacity shadow-amber"
              >
                Explore Locations
              </button>
              <button className="px-5 py-2.5 rounded-xl glass text-foreground font-medium text-sm hover:glass-hover transition-all border border-border">
                Save to Map
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute z-30 left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-foreground hover:glass-hover transition-all"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute z-30 right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-foreground hover:glass-hover transition-all"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute z-30 bottom-5 right-6 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current ? "w-6 h-2 bg-amber" : "w-2 h-2 bg-overlay-foreground/30 hover:bg-overlay-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
