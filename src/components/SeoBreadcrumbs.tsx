import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Crumb } from "@/lib/seoSchema";

interface SeoBreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

/**
 * Visible breadcrumb trail. Google only trusts BreadcrumbList markup that
 * mirrors a trail the user can actually see, so this renders from the same
 * `items` array passed to buildBreadcrumbSchema().
 */
export default function SeoBreadcrumbs({ items, className = "" }: SeoBreadcrumbsProps) {
  if (!items?.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.name}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {item.path && !last ? (
                <Link
                  to={item.path}
                  className="hover:text-amber transition-colors truncate max-w-[9rem] sm:max-w-none"
                >
                  {item.name}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="text-foreground/80 truncate max-w-[12rem] sm:max-w-none"
                >
                  {item.name}
                </span>
              )}
              {!last && <ChevronRight className="w-3 h-3 opacity-50 flex-shrink-0" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
