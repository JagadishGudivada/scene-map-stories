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

  useEffect(() => {
    const i = setInterval(() => setTeaserIdx((n) => (n + 1) % TEASERS.length), 3500);
    return () => clearInterval(i);
  }, []);

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 240, damping: 18 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(true)}
        aria-label="Spot Radar: find filming spots near you"
        className="group fixed z-40 bottom-20 right-4 sm:bottom-6 sm:right-6 h-14 pl-4 pr-5 rounded-full bg-foreground text-background shadow-2xl shadow-foreground/30 flex items-center gap-2.5 overflow-hidden ring-1 ring-foreground/20"
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
