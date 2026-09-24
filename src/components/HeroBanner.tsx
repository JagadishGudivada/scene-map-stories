import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { slugifyTitle } from "@/hooks/useAITitleSearch";
import { heroSlides, type Title } from "@/lib/mockData";
import { cn } from "@/lib/utils";

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

const AUTOPLAY_MS = 6000;
const WHEEL_THRESHOLD = 46;
const WHEEL_COOLDOWN_MS = 650;

const HOOK_LINES: Record<string, string> = {
  "peaky-blinders": "That backstreet is real — cobbles and all — in Digbeth, Birmingham.",
  bridgerton: "The Bridgerton family home? A working stately manor in Wiltshire, open to visitors.",
  "the-white-lotus": "The infinity pool everyone screenshotted — same edge, same view, in Sicily.",
  "harry-potter": "Diagon Alley's real cobbles are in York — and yes, you can walk them.",
};

function buildHookLine(slide: { title: string; locationTag?: string }): string {
  const key = slide.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (HOOK_LINES[key]) return HOOK_LINES[key];
  if (slide.locationTag) return `Shot in ${slide.locationTag} — and you can stand there.`;
  return "A real place from this story — and you can go.";
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function signedOffset(index: number, current: number, length: number) {
  let offset = index - current;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
}

function formatCount(value: number) {
  return String(value).padStart(2, "0");
}

export default function HeroBanner({ titles = [] }: HeroBannerProps) {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const wheelTotalRef = useRef(0);
  const wheelCooldownRef = useRef(0);
  const currentRef = useRef(0);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  const slides = useMemo<HeroSlide[]>(() => {
    if (titles.length > 0) {
      return titles.slice(0, 8).map((title) => ({
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
    return heroSlides.map((slide) => ({
      ...slide,
      locationCount: 0,
      hookLine: buildHookLine({ title: slide.title, locationTag: slide.locationTag }),
    })) as HeroSlide[];
  }, [titles]);

  const selectSlide = useCallback((index: number, nextDirection?: number) => {
    if (slides.length === 0) return;
    const nextIndex = wrapIndex(index, slides.length);
    const resolvedDirection = nextDirection ?? (nextIndex > currentRef.current ? 1 : -1);
    setDirection(resolvedDirection);
    currentRef.current = nextIndex;
    setCurrent(nextIndex);
  }, [slides.length]);

  const previous = useCallback(() => {
    selectSlide(currentRef.current - 1, -1);
  }, [selectSlide]);

  const next = useCallback(() => {
    selectSlide(currentRef.current + 1, 1);
  }, [selectSlide]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    if (current >= slides.length && slides.length > 0) selectSlide(0, -1);
  }, [current, selectSlide, slides.length]);

  useEffect(() => {
    const handleVisibility = () => setIsDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || isInteracting || !isDocumentVisible || prefersReducedMotion) return;
    const timer = window.setInterval(next, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [isDocumentVisible, isInteracting, next, prefersReducedMotion, slides.length]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (event: WheelEvent) => {
      const horizontalDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
      const isHorizontalIntent = Math.abs(horizontalDelta) > Math.abs(event.deltaY) || event.shiftKey;
      if (!isHorizontalIntent || Math.abs(horizontalDelta) < 2) return;

      event.preventDefault();
      const now = Date.now();
      if (now < wheelCooldownRef.current) return;
      wheelTotalRef.current += horizontalDelta;

      if (Math.abs(wheelTotalRef.current) >= WHEEL_THRESHOLD) {
        if (wheelTotalRef.current > 0) next();
        else previous();
        wheelTotalRef.current = 0;
        wheelCooldownRef.current = now + WHEEL_COOLDOWN_MS;
      }
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [next, previous]);

  const openTitle = (slide: HeroSlide, autoSave = false) => {
    navigate(`/title/${slugifyTitle(slide.title, slide.year, slide.type)}`, {
      state: {
        title: slide.title,
        year: slide.year,
        type: slide.type,
        locationCount: slide.locationCount,
        autoSave,
        coverImage: slide.coverImage,
        backdropImage: slide.image,
      },
    });
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsInteracting(false);
    const intent = info.offset.x + info.velocity.x * 0.18;
    if (intent < -70) next();
    if (intent > 70) previous();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    }
  };

  const activeSlide = slides[current];
  if (!activeSlide) return null;

  return (
    <section
      ref={stageRef}
      aria-label="Featured screen locations"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocusCapture={() => setIsInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsInteracting(false);
      }}
      className="relative isolate -mx-4 sm:-mx-6 overflow-hidden rounded-2xl sm:rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="absolute inset-0 overflow-hidden bg-card" aria-hidden="true">
        {slides.map((slide, index) => (
          <motion.img
            key={`ambient-${slide.id}`}
            src={slide.image}
            alt=""
            initial={false}
            animate={{ opacity: index === current ? 0.34 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 1.1, ease: "easeOut" }}
            className="absolute -inset-[12%] h-[124%] w-[124%] scale-110 object-cover blur-3xl saturate-150"
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-background/45 via-background/65 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
      </div>

      <div className="relative px-4 pb-4 pt-5 sm:px-8 sm:pb-6 sm:pt-7 lg:px-12 lg:pb-7">
        <div className="mb-3 flex items-center justify-between px-1 sm:mb-4">
          <div className="flex items-center gap-2">
            <span className="h-px w-7 bg-amber" />
            <span className="font-mono text-[10px] uppercase text-overlay-foreground/70 sm:text-[11px]">
              Now showing
            </span>
          </div>
          <span className="hidden font-mono text-[10px] uppercase text-overlay-foreground/50 sm:block">
            Drag or scroll sideways
          </span>
        </div>

        <div className="relative h-[430px] sm:h-[520px] lg:h-[570px] [perspective:1800px] [transform-style:preserve-3d]">
          {slides.map((slide, index) => {
            const offset = signedOffset(index, current, slides.length);
            const distance = Math.abs(offset);
            const isActive = offset === 0;
            const isVisible = distance <= 2;
            const x = offset * 57;
            const rotateY = isActive ? 0 : offset < 0 ? 34 : -34;
            const scale = isActive ? 1 : distance === 1 ? 0.78 : 0.62;
            const opacity = isActive ? 1 : distance === 1 ? 0.48 : 0;

            return (
              <motion.article
                key={slide.id}
                aria-hidden={!isActive}
                initial={false}
                animate={{
                  x: `${x}%`,
                  scale,
                  opacity,
                  rotateY,
                  z: isActive ? 90 : distance === 1 ? -180 : -360,
                }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 150, damping: 24, mass: 0.9 }}
                onClick={() => {
                  if (!isActive) selectSlide(index, offset > 0 ? 1 : -1);
                }}
                className={cn(
                  "absolute inset-x-0 top-0 mx-auto h-[400px] w-[78%] max-w-[390px] overflow-hidden rounded-xl border border-overlay-foreground/10 bg-card shadow-float sm:h-[485px] sm:w-[48%] sm:max-w-[430px] lg:h-[535px] lg:w-[38%] lg:max-w-[450px] [backface-visibility:hidden]",
                  isActive ? "z-20 cursor-grab active:cursor-grabbing" : "z-10 cursor-pointer",
                  !isVisible && "pointer-events-none",
                )}
                style={{ transformStyle: "preserve-3d" }}
              >
                <motion.div
                  drag={isActive ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.12}
                  onDragStart={() => setIsInteracting(true)}
                  onDragEnd={handleDragEnd}
                  className="relative h-full w-full touch-pan-y"
                >
                  <picture>
                    {slide.imageMobileSrcSet && (
                      <source media="(max-width: 767px)" srcSet={slide.imageMobileSrcSet} sizes="78vw" />
                    )}
                    {slide.imageDesktopSrcSet && (
                      <source media="(min-width: 768px)" srcSet={slide.imageDesktopSrcSet} sizes="(max-width: 1279px) 48vw, 450px" />
                    )}
                    <img
                      src={slide.coverImage || slide.image}
                      srcSet={slide.imageMobileSrcSet ? undefined : slide.imageSrcSet}
                      sizes={slide.imageSizes || "(max-width: 767px) 78vw, 450px"}
                      alt={isActive ? slide.title : ""}
                      className="absolute inset-0 h-full w-full select-none object-cover"
                      style={slide.imagePosition ? { objectPosition: slide.imagePosition } : undefined}
                      draggable={false}
                    />
                  </picture>
                  <div className="absolute inset-0 bg-gradient-to-t from-overlay via-overlay/35 to-transparent" />
                  {!isActive && <div className="absolute inset-0 bg-overlay/35" />}

                  {isActive && (
                    <motion.div
                      key={`${slide.id}-content`}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: prefersReducedMotion ? 0 : 0.14 }}
                      className="absolute inset-x-0 bottom-0 z-10 p-5 text-overlay-foreground sm:p-7"
                    >
                      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase text-overlay-foreground/75">
                        <span className="text-amber">{slide.type}</span>
                        <span aria-hidden="true">•</span>
                        <span>{slide.year}</span>
                      </div>
                      <h2 className="mb-2 max-w-[14ch] font-serif text-3xl italic leading-[1.05] sm:text-5xl">
                        {slide.title}
                      </h2>
                      <p className="mb-4 line-clamp-2 max-w-[38ch] text-xs leading-relaxed text-overlay-foreground/80 sm:text-sm">
                        {slide.hookLine}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            openTitle(slide);
                          }}
                          className="h-9 rounded-full bg-gold-deep px-4 text-xs text-charcoal shadow-card hover:brightness-105 sm:h-10"
                        >
                          Find where this was filmed
                        </Button>
                        <Button
                          variant="outline"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            openTitle(slide, true);
                          }}
                          className="h-9 rounded-full border-amber/45 bg-overlay/30 px-3 text-xs text-amber backdrop-blur hover:bg-amber/10 hover:text-amber sm:h-10"
                        >
                          <Bookmark />
                          Save
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </motion.article>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={previous}
            aria-label="Previous slide"
            className="absolute left-1 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border-overlay-foreground/15 bg-overlay/35 text-overlay-foreground backdrop-blur hover:bg-overlay/60 hover:text-amber sm:flex lg:left-3"
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-1 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border-overlay-foreground/15 bg-overlay/35 text-overlay-foreground backdrop-blur hover:bg-overlay/60 hover:text-amber sm:flex lg:right-3"
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="relative z-30 mx-auto mt-1 flex max-w-xl items-center gap-3 px-1 sm:mt-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={previous}
            aria-label="Previous slide"
            className="h-9 w-9 shrink-0 rounded-full text-overlay-foreground/70 hover:bg-overlay-foreground/10 hover:text-amber sm:hidden"
          >
            <ChevronLeft />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-1.5" role="tablist" aria-label="Choose featured title">
            {slides.map((slide, index) => (
              <Button
                key={`progress-${slide.id}`}
                type="button"
                variant="ghost"
                role="tab"
                aria-selected={index === current}
                aria-label={`Show ${slide.title}`}
                onClick={() => selectSlide(index)}
                className="group h-8 min-w-0 flex-1 rounded-none px-0 hover:bg-transparent"
              >
                <span className="relative block h-1 w-full overflow-hidden rounded-full bg-overlay-foreground/15">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-amber"
                    initial={false}
                    animate={{ width: index === current ? "100%" : "0%" }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: "easeOut" }}
                  />
                </span>
              </Button>
            ))}
          </div>

          <div className="w-[58px] shrink-0 text-right font-mono text-xs text-overlay-foreground/55" aria-live="polite" aria-atomic="true">
            <span className="text-overlay-foreground">{formatCount(current + 1)}</span>
            <span className="mx-1">/</span>
            <span>{formatCount(slides.length)}</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={next}
            aria-label="Next slide"
            className="h-9 w-9 shrink-0 rounded-full text-overlay-foreground/70 hover:bg-overlay-foreground/10 hover:text-amber sm:hidden"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </section>
  );
}