import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlides } from "@/lib/mockData";

const typeBadgeClass: Record<string, string> = {
  Movie: "badge-movie",
  Series: "badge-series",
  Book: "badge-book",
};

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((c) => (c + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const go = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const prev = () => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + heroSlides.length) % heroSlides.length);
  };

  const next = () => {
    setDirection(1);
    setCurrent((c) => (c + 1) % heroSlides.length);
  };

  const slide = heroSlides[current];

  return (
    <div className="relative h-[55vh] min-h-[380px] max-h-[600px] rounded-2xl overflow-hidden shadow-float">
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
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          {/* Gradient layers */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />
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
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id + "-content"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeClass[slide.type]}`}>
                {slide.type}
              </span>
              <span className="text-xs text-muted-foreground">{slide.year}</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl text-foreground mb-2 leading-tight">
              {slide.title}
            </h1>

            <div className="flex items-center gap-2 mb-5">
              <MapPin className="w-4 h-4 text-amber" />
              <span className="text-muted-foreground text-sm">{slide.locationTag}</span>
              <span className="text-muted/50">·</span>
              <span className="text-amber text-sm font-medium">{slide.tagline}</span>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-5 py-2.5 rounded-xl bg-gradient-amber text-charcoal font-semibold text-sm hover:opacity-90 transition-opacity shadow-amber">
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
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-foreground hover:glass-hover transition-all"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-foreground hover:glass-hover transition-all"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 right-6 flex items-center gap-1.5">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current ? "w-6 h-2 bg-amber" : "w-2 h-2 bg-foreground/30 hover:bg-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
