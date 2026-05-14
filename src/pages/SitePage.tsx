import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

interface Section {
  heading: string;
  body: string | string[];
}

interface SitePageProps {
  eyebrow?: string;
  title: string;
  intro?: string;
  sections: Section[];
}

export default function SitePage({ eyebrow, title, intro, sections }: SitePageProps) {
  const seoDesc = (intro ||
    sections.map((s) => (Array.isArray(s.body) ? s.body.join(" ") : s.body)).join(" ")
  ).slice(0, 160);

  return (
    <div className="min-h-screen pt-24 pb-12 bg-background">
      <Seo title={title} description={seoDesc} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to home
          </Link>

          {eyebrow && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber">
              {eyebrow}
            </span>
          )}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mt-2 mb-6 leading-[1.05]">
          {title}
        </h1>
        {intro && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-12">
            {intro}
          </p>
        )}

        <div className="space-y-10">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-serif text-2xl text-foreground mb-3">{s.heading}</h2>
              {Array.isArray(s.body) ? (
                <ul className="space-y-2 text-muted-foreground leading-relaxed">
                  {s.body.map((b, j) => (
                    <li key={j} className="flex gap-3">
                      <span className="text-amber mt-2">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{s.body}</p>
              )}
            </section>
          ))}
        </div>
      </article>
      <Footer />
    </div>
  );
}
