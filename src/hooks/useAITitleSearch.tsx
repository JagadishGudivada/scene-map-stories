import { useState, useRef, useCallback } from "react";
import { invokeCached } from "@/lib/aiClientCache";

export type TitleResult = {
  title: string;
  year: number;
  type: "Movie" | "Series" | "Book";
  creator?: string;
  tmdb_id?: number;
};

const TYPE_SUFFIX: Record<string, string> = { Movie: "movie", Series: "series", Book: "book" };

export function slugifyTitle(title: string, year: number, type?: string) {
  const base = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").replace(/^-+/, "")}-${year}`;
  const suffix = type ? TYPE_SUFFIX[type] : undefined;
  return suffix ? `${base}-${suffix}` : base;
}

/** Parse a title slug into its parts. */
export function parseTitleSlug(slug: string): { base: string; year?: number; type?: "Movie" | "Series" | "Book" } {
  let s = slug;
  let type: "Movie" | "Series" | "Book" | undefined;
  const typeMatch = s.match(/-(movie|series|book)$/);
  if (typeMatch) {
    type = typeMatch[1] === "series" ? "Series" : typeMatch[1] === "book" ? "Book" : "Movie";
    s = s.slice(0, -typeMatch[0].length);
  }
  const yearMatch = s.match(/-(\d{4})$/);
  const year = yearMatch ? Number(yearMatch[1]) : undefined;
  const base = yearMatch ? s.slice(0, -yearMatch[0].length) : s;
  return { base, year, type };
}

export function useAITitleSearch() {
  const [results, setResults] = useState<TitleResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setError(null);

    if (query.trim().length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const q = query.trim();
        const data = await invokeCached<any>(
          "search-titles",
          { query: q },
          q.toLowerCase(),
          { ttlSeconds: 60 * 60 * 24, persist: "session" }
        );
        const titles: TitleResult[] = (data?.titles || []).map((t: any) => ({
          title: String(t.title),
          year: Number(t.year),
          type: t.type === "Series" || t.type === "Book" ? t.type : "Movie",
          creator: t.creator || undefined,
        }));
        setResults(titles);
      } catch (e: any) {
        const msg = e?.message || "";
        if (/429/.test(msg)) setError("Too many searches — please wait a moment.");
        else if (/402/.test(msg)) setError("AI credits exhausted.");
        else setError("Search failed");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { results, isSearching, error, search, clear };
}
