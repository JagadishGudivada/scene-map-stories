import { motion } from "framer-motion";
import { Film, MapPin, Compass } from "lucide-react";

const steps = [
  {
    num: "01",
    accent: "Sa",
    accentWord: "Watched",
    title: "Watch or read something",
    body: "A show, a film, a book — anything you fall into.",
    Icon: Film,
    goldDeep: false,
  },
  {
    num: "02",
    accent: "Re",
    accentWord: "Read",
    title: "We tell you where it's real",
    body: "The café, the street, the ruin — pinned on a map.",
    Icon: MapPin,
    goldDeep: true, // arrival step — this is the place
  },
  {
    num: "03",
    accent: "Vista",
    accentWord: "Visit",
    title: "You go there",
    body: "Directions, a route, and local tips included.",
    Icon: Compass,
    goldDeep: false,
  },
];

export default function HowItWorks() {
  return (
    <section className="mb-16" aria-labelledby="how-it-works-heading">
      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-[10px] font-mono tracking-[0.24em] uppercase text-gold-soft">
          Sa · Re · Vista
        </span>
        <span className="text-[11px] text-muted-foreground">How it works</span>
      </div>
      <h2 id="how-it-works-heading" className="sr-only">How Sarevista works</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.num}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="relative rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-mono tracking-[0.2em] text-gold-soft">
                {s.num}
              </span>
              <span className="font-serif italic text-sm text-muted-foreground">
                <span className={s.goldDeep ? "text-gold-deep font-medium" : "text-foreground/80"}>
                  {s.accent}
                </span>
                <span className="ml-1.5 text-muted-foreground/70">— {s.accentWord}</span>
              </span>
            </div>
            <div
              className={`inline-flex w-11 h-11 rounded-xl items-center justify-center mb-4 ${
                s.goldDeep
                  ? "bg-gold-deep text-charcoal shadow-lg shadow-black/30"
                  : "bg-foreground/5 text-foreground/80 ring-gold-hairline"
              }`}
            >
              <s.Icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <h3 className="font-serif italic text-xl text-foreground mb-2 leading-tight">
              {s.title}
            </h3>
            <p className="text-sm font-light text-muted-foreground leading-relaxed">
              {s.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
