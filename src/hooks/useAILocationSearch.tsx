import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TitleResult = {
  title: string;
  year: number;
  type: "Movie" | "Series" | "Book";
  creator?: string;
  description?: string;
};

export function useAILocationSearch() {
  const [aiResults, setAiResults] = useState<TitleResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchLocations = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAiError(null);

    if (query.trim().length < 2) {
      setAiResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("search-locations", {
          body: { query: query.trim() },
        });

        if (error) {
          console.error("AI search error:", error);
          setAiError("Search failed");
          setAiResults([]);
          return;
        }

        if (data?.error) {
          setAiError(data.error);
          setAiResults([]);
          return;
        }

        const titles: TitleResult[] = (data?.titles || []).map((t: any) => ({
          title: String(t.title),
          year: Number(t.year),
          type: t.type === "Series" || t.type === "Book" ? t.type : "Movie",
          creator: t.creator || undefined,
          description: t.description || undefined,
        }));

        setAiResults(titles);
      } catch (err) {
        console.error("AI search error:", err);
        setAiError("Search failed");
        setAiResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  const clearResults = useCallback(() => {
    setAiResults([]);
    setAiError(null);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { aiResults, isSearching, aiError, searchLocations, clearResults };
}
