import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, MapPin, Star } from "lucide-react";
import type { Title } from "@/lib/mockData";

function slugify(title: string, year: number) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}-${year}`;
}

interface CinemaCardProps {
  title: Title;
  size?: "sm" | "md" | "lg";
  delay?: number;
}

const typeBadgeClass: Record<string, string> = {
  Movie: "badge-movie",
  Series: "badge-series",
  Book: "badge-book",
};

export default function CinemaCard({ title, size = "md", delay = 0 }: CinemaCardProps) {
  const [saved, setSaved] = useState(false);

  const heights: Record<string, string> = {
    sm: "h-52",
    md: "h-72",
    lg: "h-96",
  };

  return (
    <Link to={`/title/${slugify(title.title, title.year)}`}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={`relative ${heights[size]} rounded-2xl overflow-hidden group cursor-pointer shadow-card`}
    >
      {/* Background Image */}
      <img
        src={title.coverImage}
        alt={title.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 cinema-overlay" />

      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top row: type badge + save button */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeClass[title.type]}`}>
          {title.type}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setSaved(!saved); }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            saved
              ? "bg-amber text-charcoal"
              : "glass text-foreground hover:bg-amber hover:text-charcoal"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 text-amber fill-amber" />
          <span className="text-xs font-semibold text-amber">{title.rating}</span>
          <span className="text-xs text-muted-foreground ml-1">{title.year}</span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-foreground text-lg leading-tight mb-2">
          {title.title}
        </h3>

        {/* Locations */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 glass rounded-full px-2.5 py-1">
            <MapPin className="w-3 h-3 text-amber" />
            <span className="text-xs text-foreground font-medium">{title.locationCount} locations</span>
          </div>
          {title.locations.slice(0, 2).map((loc) => (
            <span key={loc} className="glass text-xs text-muted-foreground px-2.5 py-1 rounded-full">
              {loc}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
    </Link>
  );
}
