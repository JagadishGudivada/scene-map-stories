import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MapPin } from "@/components/LeafletMap";

export function useAILocationSearch() {
  const [aiResults, setAiResults] = useState<MapPin[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchLocations = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAiError(null);

    if (query.trim().length < 3) {
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

        const locations: MapPin[] = (data?.locations || []).map((loc: any) => ({
          lat: loc.lat,
          lng: loc.lng,
          label: loc.label,
          title: loc.title,
          type: loc.type === "Movie" || loc.type === "Series" || loc.type === "Book" ? loc.type : "Movie",
          image: loc.image || undefined,
        }));

        setAiResults(locations);
      } catch (err) {
        console.error("AI search error:", err);
        setAiError("Search failed");
        setAiResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  }, []);

  const clearResults = useCallback(() => {
    setAiResults([]);
    setAiError(null);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { aiResults, isSearching, aiError, searchLocations, clearResults };
}
