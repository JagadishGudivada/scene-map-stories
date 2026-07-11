import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radar } from "lucide-react";
import SpotRadarDialog from "./SpotRadarDialog";

/**
 * Icon-only circular FAB, docked above the mobile tab bar.
 * Expands to show a label only on hover (desktop) or on second-tap (mobile).
 * Never permanently sits on top of body text.
 */
export default function SpotRadarFab() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.5);
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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (expanded) {
            setOpen(true);
          } else {
            setExpanded(true);
            setTimeout(() => setExpanded(false), 2500);
          }
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        aria-label="Spot Radar: find filming spots near you"
        className="group fixed z-40 bottom-24 right-4 sm:bottom-6 sm:right-6 h-14 rounded-full bg-gold-deep text-charcoal shadow-2xl shadow-black/40 flex items-center gap-2 overflow-hidden ring-1 ring-black/20 pl-4 pr-4 whitespace-nowrap"
        style={{
          maxWidth: expanded ? 220 : 56,
          transition: "max-width 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <motion.span
          animate={{ rotate: [0, -10, 10, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
          className="shrink-0 flex items-center justify-center"
        >
          <Radar className="w-6 h-6" strokeWidth={2.2} />
        </motion.span>
        <span
          className="text-sm font-semibold transition-opacity duration-200"
          style={{ opacity: expanded ? 1 : 0 }}
        >
          Scan around
        </span>
      </motion.button>

      <SpotRadarDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
