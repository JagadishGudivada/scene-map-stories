import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { popularLocations } from "@/lib/mockData";

export default function PopularLocations() {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-2xl text-foreground">Popular Filming Locations</h2>
        <button className="text-sm text-amber hover:text-amber/80 transition-colors font-medium">
          View map →
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {popularLocations.map((loc, i) => (
          <motion.button
            key={loc.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-full glass border border-white/10 hover:border-amber/40 hover:bg-amber/5 transition-all duration-200"
          >
            <span className="text-base leading-none">{loc.country}</span>
            <span className="text-sm font-medium text-foreground">{loc.name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 text-amber" />
              {loc.count} titles
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
