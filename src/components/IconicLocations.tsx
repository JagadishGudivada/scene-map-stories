import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ICONIC_LOCATIONS, type IconicLocation } from "@/lib/iconicLocations";
import { usePexelsImage } from "@/hooks/usePexelsImage";
import "flag-icons/css/flag-icons.min.css";

function IconicCard({ loc, i, onClick }: { loc: IconicLocation; i: number; onClick: () => void }) {
  const src = usePexelsImage(loc.name, undefined, loc.country, loc.image);
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(i, 4) * 0.05 }}
      onClick={onClick}
      className="scrim-bottom group relative shrink-0 w-52 sm:w-72 aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden text-left ring-1 ring-white/5 shadow-xl shadow-black/40"
    >
      <img
        src={src || loc.image}
        alt={`${loc.name}, ${loc.country}`}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] text-white/95">
        <span className={`fi fi-${loc.countryIso2} rounded-sm overflow-hidden`} style={{ width: 14, height: 10 }} />
        <span className="font-medium">{loc.country}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-4">
        <h3 className="font-serif italic text-lg sm:text-2xl text-white leading-tight drop-shadow">
          {loc.name}
        </h3>
        <p className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-white/70 mt-0.5 sm:mt-1 truncate">
          {loc.seenIn}
        </p>
      </div>
    </motion.button>
  );
}

export default function IconicLocations() {
  const navigate = useNavigate();
  return (
    <section className="mb-10 sm:mb-16" aria-labelledby="iconic-heading">
      <div className="mb-3 sm:mb-5">
        <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.24em] uppercase text-gold-soft mb-1.5 sm:mb-2">
          You might recognise this place
        </p>
        <h2 id="iconic-heading" className="font-serif italic text-xl sm:text-4xl text-foreground leading-tight">
          Iconic filming locations
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 max-w-xl">
          Real places you've seen on screen a hundred times — and can actually visit.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0 pb-2">
        {ICONIC_LOCATIONS.map((loc, i) => (
          <IconicCard
            key={loc.id}
            loc={loc}
            i={i}
            onClick={() => navigate(`/map?search=${encodeURIComponent(loc.name)}`)}
          />
        ))}
      </div>
    </section>
  );
}
