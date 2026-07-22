import { motion } from "framer-motion";
import { Stamp, Sparkles, BookOpen } from "lucide-react";

const pillars = [
  {
    icon: Stamp,
    title: "Your passport, not a directory",
    body: "Every place you visit lights up your world map. Tiers, milestones, and a memory lane only you can fill.",
  },
  {
    icon: Sparkles,
    title: "AI concierge, not a search box",
    body: "Ask in plain English — 'quiet cafés from Before Sunrise' — and get scouted locations, not a list of pins.",
  },
  {
    icon: BookOpen,
    title: "Books, series & film — one map",
    body: "From Middle-earth to Middle England. If a story is set somewhere real, it belongs on Sarevista.",
  },
];

export default function WhySarevista() {
  return (
    <section className="mb-10 sm:mb-16" aria-labelledby="why-sarevista-heading">
      <div className="flex items-baseline gap-3 mb-4 sm:mb-6">
        <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.24em] uppercase text-gold-soft">
          Why Sarevista
        </span>
        <span className="text-[10px] sm:text-[11px] text-muted-foreground">
          What the other maps don't do
        </span>
      </div>
      <h2 id="why-sarevista-heading" className="sr-only">
        Why Sarevista is different from a filming-locations directory
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        {pillars.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5 hover:border-gold-soft/60 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-gold-soft/10 border border-gold-soft/20 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-gold-soft" strokeWidth={2} />
              </div>
              <h3 className="font-serif italic text-lg sm:text-xl leading-tight mb-1.5">
                {p.title}
              </h3>
              <p className="text-xs sm:text-sm text-foreground/75 leading-relaxed">
                {p.body}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
