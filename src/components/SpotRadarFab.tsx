import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radar } from "lucide-react";
import SpotRadarDialog from "./SpotRadarDialog";

const TEASERS = [
  "Near me",
  "Find spots",
  "Scan around",
  "Local gems",
  "Radar on",
];

export default function SpotRadarFab() {
  const [open, setOpen] = useState(false);
  const [teaserIdx, setTeaserIdx] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setTeaserIdx((n) => (n + 1) % TEASERS.length), 3500);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.button
        initial={false}
        animate={{
          opacity: scrolled ? 1 : 0,
          scale: scrolled ? 1 : 0.8,
          y: scrolled ? 0 : 20,
          pointerEvents: scrolled ? "auto" : "none",
        }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(true)}
        aria-label="Spot Radar: find filming spots near you"
        aria-hidden={!scrolled}
        className="group fixed z-40 bottom-20 right-4 sm:bottom-6 sm:right-6 sm:opacity-100 sm:pointer-events-auto h-14 pl-4 pr-5 rounded-full bg-foreground text-background shadow-2xl shadow-foreground/30 flex items-center gap-2.5 overflow-hidden ring-1 ring-foreground/20"
      >
        {/* Shimmer sweep */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-teal/30 to-transparent" />
        <motion.span
          animate={{ rotate: [0, -10, 10, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
          className="relative"
        >
          <Radar className="w-5 h-5 text-teal" />
        </motion.span>
        <div className="relative flex flex-col items-start leading-tight">
          <span className="text-[9px] uppercase tracking-widest text-background/60 font-mono">
            spot radar
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={teaserIdx}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-semibold"
            >
              {TEASERS[teaserIdx]}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.button>

      <SpotRadarDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
