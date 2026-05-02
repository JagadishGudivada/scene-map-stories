import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TitleResult = {
  title: string;
  year: number;
  type: "Movie" | "Series" | "Book";
  creator?: string;
};

export function slugifyTitle(title: string, year: number) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").replace(/^-+/, "")}-${year}`;
}

export function useAITitleSearch() {
  const [results, setResults] = useState<TitleResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setError(null);

    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("search-titles", {
          body: { query: query.trim() },
        });
        if (fnError) {
          setError("Search failed");
          setResults([]);
          return;
        }
        if (data?.error) {
          setError(data.error);
          setResults([]);
          return;
        }
        const titles: TitleResult[] = (data?.titles || []).map((t: any) => ({
          title: String(t.title),
          year: Number(t.year),
          type: t.type === "Series" || t.type === "Book" ? t.type : "Movie",
          creator: t.creator || undefined,
        }));
        setResults(titles);
      } catch (e) {
        console.error("title search error", e);
        setError("Search failed");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { results, isSearching, error, search, clear };
}
