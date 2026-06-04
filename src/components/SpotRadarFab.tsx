import { useState } from "react";
import { motion } from "framer-motion";
import { Radar } from "lucide-react";
import SpotRadarDialog from "./SpotRadarDialog";

/**
 * Floating action button that opens the Spot Radar dialog.
 * Positioned bottom-left so it doesn't collide with the Cinematic Roulette FAB (bottom-right).
 */
export default function SpotRadarFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        onClick={() => setOpen(true)}
        aria-label="Open Spot Radar"
        className="fixed bottom-6 left-6 z-40 group"
      >
        <div className="relative">
          {/* Pulse rings */}
          <span className="absolute inset-0 rounded-full bg-teal/30 animate-ping opacity-60" />
          <span className="absolute inset-0 rounded-full bg-teal/20 animate-ping [animation-delay:1s] opacity-40" />
          <div className="relative w-14 h-14 rounded-full bg-background border-2 border-teal/60 backdrop-blur-md flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
            <Radar className="w-5 h-5 text-teal" />
          </div>
          <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-background border border-border text-[10px] uppercase tracking-[0.18em] text-teal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Near me
          </span>
        </div>
      </motion.button>

      <SpotRadarDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
