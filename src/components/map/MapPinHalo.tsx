import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppMap, MapPin as MapPinType } from "@/components/LeafletMap";

interface MapPinHaloProps {
  map: AppMap | null;
  pin: MapPinType | null;
  variant?: "selected" | "highlighted";
}

/**
 * Overlays a cinematic halo + orbiting dot on top of a projected map pin.
 * Uses map.project to stay locked to the geographic point while the map pans/zooms.
 * Rendered above Leaflet DOM but below UI chrome via z-index.
 */
export default function MapPinHalo({ map, pin, variant = "selected" }: MapPinHaloProps) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!map || !pin) {
      setPoint(null);
      return;
    }

    const update = () => {
      const p = map.project([pin.lng, pin.lat]);
      setPoint({ x: p.x, y: p.y });
    };

    update();
    map.on("move", update);
    map.on("zoom", update);
    map.on("rotate", update);
    return () => {
      map.off("move", update);
      map.off("zoom", update);
      map.off("rotate", update);
    };
  }, [map, pin]);

  return (
    <AnimatePresence>
      {pin && point && (
        <motion.div
          key={`${pin.lat}-${pin.lng}-${variant}`}
          className="pointer-events-none absolute z-[600]"
          style={{ left: point.x, top: point.y, transform: "translate(-50%, -50%)" }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          {/* Outer breathing ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              width: 88,
              height: 88,
              left: -44,
              top: -44,
              border: "1.5px solid #F4C77B",
              boxShadow: "0 0 40px 4px rgba(244,199,123,0.35)",
            }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
          {/* Inner solid halo */}
          <div
            className="absolute rounded-full"
            style={{
              width: 44,
              height: 44,
              left: -22,
              top: -22,
              background:
                "radial-gradient(circle, rgba(244,199,123,0.35) 0%, rgba(244,199,123,0.08) 60%, transparent 80%)",
            }}
          />
          {/* Orbiting dot */}
          {variant === "selected" && (
            <motion.div
              className="absolute"
              style={{ width: 60, height: 60, left: -30, top: -30 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            >
              <div
                className="absolute rounded-full bg-gold-deep"
                style={{
                  width: 6,
                  height: 6,
                  top: -3,
                  left: "50%",
                  marginLeft: -3,
                  boxShadow: "0 0 10px 2px rgba(181,101,29,0.8)",
                }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
