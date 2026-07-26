import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";

const books = [
  { title: "Call Me By Your Name", place: "Crema, Italy", slug: "call-me-by-your-name-2007-book" },
  { title: "The Talented Mr. Ripley", place: "Ischia, Italy", slug: "the-talented-mr-ripley-1955-book" },
  { title: "Norwegian Wood", place: "Tokyo, Japan", slug: "norwegian-wood-1987-book" },
  { title: "The Shadow of the Wind", place: "Barcelona, Spain", slug: "the-shadow-of-the-wind-2001-book" },
];

export default function FromThePage() {
  return (
    <section className="mb-10 sm:mb-16" aria-labelledby="from-the-page-heading">
      <div className="flex items-baseline gap-3 mb-4 sm:mb-6">
        <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.24em] uppercase text-gold-soft">
          From the page to the place
        </span>
        <span className="text-[10px] sm:text-[11px] text-muted-foreground">
          Books belong on the map too
        </span>
      </div>
      <h2 id="from-the-page-heading" className="font-serif italic text-xl sm:text-3xl leading-tight mb-4 sm:mb-6">
        Novels are filmed nowhere — but set somewhere real.
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {books.map((b, i) => (
          <motion.div
            key={b.slug}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
          >
            <Link
              to={`/title/${b.slug}`}
              state={{ title: b.title, type: "Book" }}
              className="group block h-full rounded-2xl border border-border/60 bg-card/60 p-3.5 sm:p-5 hover:border-gold-soft/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gold-soft/10 border border-gold-soft/20 flex items-center justify-center mb-3">
                <BookOpen className="w-3.5 h-3.5 text-gold-soft" />
              </div>
              <h3 className="font-serif text-sm sm:text-lg leading-tight mb-1 line-clamp-2">{b.title}</h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground">{b.place}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-gold-soft opacity-0 group-hover:opacity-100 transition-opacity">
                Open the map <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
