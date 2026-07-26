import { useNavigate } from "react-router-dom";
import { ChevronRight, Clapperboard, MapPinned, Crown, Flame, BookOpen } from "lucide-react";

const chips = [
  { label: "Recently Filmed", slug: "recent", icon: Clapperboard },
  { label: "UK Locations", slug: "uk", icon: MapPinned },
  { label: "Period Dramas", slug: "period", icon: Crown },
  { label: "Most Visited", slug: "most-visited", icon: Flame },
  { label: "Books", slug: "books", icon: BookOpen },
  { label: "Book-to-Screen", slug: "book-to-screen", icon: BookOpen },
];

export default function QuickFilterChips() {
  const navigate = useNavigate();
  return (
    <div className="mb-12 -mx-4 sm:mx-0">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 sm:px-0 whitespace-nowrap">
        {chips.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.slug}
              onClick={() => navigate(`/explore?filter=${c.slug}`)}
              className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border/70 bg-transparent text-sm text-foreground/85 hover:border-amber/40 hover:text-foreground transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-gold-soft" />
              {c.label}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
