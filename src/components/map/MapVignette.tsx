import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { AppMap } from "@/components/LeafletMap";

interface MapVignetteProps {
  map: AppMap | null;
}

/**
 * Screen-space cinematic overlay on top of the map:
 * - Radial vignette that darkens the edges
 * - Subtle grain (uses existing `.grain` utility)
 * - Rotating compass rose bottom-right that tracks map bearing
 * Entirely pointer-events-none — never intercepts map interactions.
 */
export default function MapVignette({ map }: MapVignetteProps) {
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map) return;
    const update = () => setBearing(map.getBearing());
    update();
    map.on("rotate", update);
    map.on("moveend", update);
    return () => {
      map.off("rotate", update);
      map.off("moveend", update);
    };
  }, [map]);

  return (
    <>
      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[400]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, transparent 55%, hsl(20 40% 5% / 0.55) 100%)",
        }}
      />
      {/* Grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[401] grain opacity-[0.06] mix-blend-overlay"
      />

      {/* Compass rose */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-6 right-6 z-[402] hidden md:block"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 220, damping: 20 }}
      >
        <div className="relative w-12 h-12 rounded-full glass border border-gold-deep/40 shadow-card flex items-center justify-center">
          <motion.svg
            width="34"
            height="34"
            viewBox="0 0 40 40"
            animate={{ rotate: -bearing }}
            transition={{ type: "spring", stiffness: 60, damping: 14 }}
          >
            <circle cx="20" cy="20" r="18" fill="none" stroke="hsl(38 60% 55% / 0.35)" strokeWidth="0.6" />
            <polygon points="20,4 23,20 20,17 17,20" fill="#F4C77B" />
            <polygon points="20,36 23,20 20,23 17,20" fill="hsl(38 30% 40%)" />
            <text
              x="20"
              y="13"
              textAnchor="middle"
              fontSize="6"
              fontFamily="'JetBrains Mono', monospace"
              fill="#F4C77B"
              letterSpacing="0.2"
            >
              N
            </text>
          </motion.svg>
        </div>
      </motion.div>
    </>
  );
}
