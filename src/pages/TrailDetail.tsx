import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import Seo from "@/components/Seo";
import { useTrails } from "@/hooks/useTrails";

export default function TrailDetail() {
  const { id } = useParams<{ id: string }>();
  const { trails, loading } = useTrails(8);
  const trail = trails.find((t) => t.id === id);

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <Seo title={trail ? `${trail.name} · Sarevista` : "Trail · Sarevista"} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading trail…</p>
        ) : !trail ? (
          <p className="text-sm text-muted-foreground">Trail not found.</p>
        ) : (
          <>
            <span className="text-[10px] font-mono tracking-[0.24em] uppercase text-gold-soft">
              {trail.kind === "walking" ? "Walking trail" : "One-day drive"}
            </span>
            <h1 className="font-serif italic text-3xl sm:text-4xl mt-2 mb-4">
              {trail.name}
            </h1>
            <p className="text-sm text-foreground/80 mb-8 max-w-2xl">
              Complete this trail and you'll have visited {trail.stops.length} screen{" "}
              {trail.stops.length === 1 ? "location" : "locations"}
              {trail.titleCount > 0 && (
                <>
                  {" "}from {trail.titleCount}{" "}
                  {trail.titleCount === 1 ? "film/series" : "films & series"}
                </>
              )}
              .
            </p>

            <ol className="space-y-3">
              {trail.stops.map((s, i) => (
                <li
                  key={s.slug}
                  className="flex gap-3 sm:gap-4 rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4"
                >
                  <div className="shrink-0 w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center font-mono text-xs text-gold-soft">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  {s.image && (
                    <img
                      src={s.image}
                      alt={s.name}
                      loading="lazy"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/location/${s.slug}`}
                      className="font-serif italic text-lg hover:text-gold-deep transition-colors"
                    >
                      {s.name}
                    </Link>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
