import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";

const books = [
  {
    title: "Call Me By Your Name",
    author: "André Aciman",
    isbn: "9780374299217",
    place: "Crema, Italy",
    slug: "call-me-by-your-name-2007-book",
  },
  {
    title: "The Talented Mr. Ripley",
    author: "Patricia Highsmith",
    isbn: "9780393332148",
    place: "Ischia, Italy",
    slug: "the-talented-mr-ripley-1955-book",
  },
  {
    title: "Norwegian Wood",
    author: "Haruki Murakami",
    isbn: "9780375704024",
    place: "Tokyo, Japan",
    slug: "norwegian-wood-1987-book",
  },
  {
    title: "The Shadow of the Wind",
    author: "Carlos Ruiz Zafón",
    isbn: "9780143034902",
    place: "Barcelona, Spain",
    slug: "the-shadow-of-the-wind-2001-book",
  },
];

// Open Library Covers API — https://openlibrary.org/dev/docs/api/covers
const coverByIsbn = (isbn: string) =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
const coverById = (id: number) =>
  `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

function useOpenLibraryCovers() {
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        books.map(async (b) => {
          try {
            const url = new URL("https://openlibrary.org/search.json");
            url.searchParams.set("title", b.title);
            url.searchParams.set("author", b.author);
            url.searchParams.set("fields", "cover_i");
            url.searchParams.set("limit", "5");
            const res = await fetch(url.toString());
            const data = await res.json();
            const doc = (data?.docs || []).find((d: any) => d.cover_i);
            if (doc?.cover_i) return [b.slug, coverById(doc.cover_i)] as const;
          } catch {
            /* fall through to ISBN cover */
          }
          return [b.slug, coverByIsbn(b.isbn)] as const;
        })
      );
      if (!cancelled) setCovers(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return covers;
}

export default function FromThePage() {
  const covers = useOpenLibraryCovers();

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
              className="group block h-full rounded-2xl border border-border/60 bg-card/60 overflow-hidden hover:border-gold-soft/60 transition-colors"
            >
              <div className="relative aspect-[2/3] bg-muted/40 overflow-hidden">
                {covers[b.slug] ? (
                  <img
                    src={covers[b.slug]}
                    alt={`${b.title} book cover — story set in ${b.place}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-gold-soft/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/70 backdrop-blur px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.16em] text-gold-soft">
                  <BookOpen className="w-2.5 h-2.5" /> Book
                </span>
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="font-serif text-sm sm:text-lg leading-tight mb-1 line-clamp-2">{b.title}</h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">{b.place}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-gold-soft opacity-0 group-hover:opacity-100 transition-opacity">
                  Open the map <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
