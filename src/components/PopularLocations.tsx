import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { popularLocations } from "@/lib/mockData";

function slugifyLocation(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
}

export default function PopularLocations() {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-2xl text-foreground">Popular Filming Locations</h2>
        <Link to="/map" className="text-sm text-amber hover:text-amber/80 transition-colors font-medium">
          View map →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {popularLocations.map((loc, i) => (
          <Link key={loc.name} to={`/location/${slugifyLocation(loc.name)}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-full glass border border-border hover:border-amber/40 hover:bg-amber/5 transition-all duration-200 cursor-pointer"
            >
              <span className="text-base leading-none">{loc.country}</span>
              <span className="text-sm font-medium text-foreground">{loc.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 text-amber" />
                {loc.count} titles
              </span>
            </motion.div>
          </Link>
        ))}
      </div>
    </section>
  );
}
