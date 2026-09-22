import { useState, useRef, useCallback, useEffect } from "react";
import { invokeCached } from "@/lib/aiClientCache";
import type { SearchLocationsResponse } from "@/types/edge";
import type { MapPin } from "@/components/LeafletMap";

export function useAILocationSearch() {
  const [aiResults, setAiResults] = useState<MapPin[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);

  // Cancel any pending debounce and ignore late responses after unmount.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
        const q = query.trim();
        const data = await invokeCached<SearchLocationsResponse>(
          "search-locations",
          { query: q },
          q.toLowerCase(),
          { ttlSeconds: 60 * 60 * 24, persist: "session" }
        );

        const locations: MapPin[] = (data?.locations || []).map((loc) => ({
          lat: loc.lat,
          lng: loc.lng,
          label: loc.label,
          title: loc.title,
          type: loc.type === "Movie" || loc.type === "Series" || loc.type === "Book" ? loc.type : "Movie",
          image: loc.image || undefined,
        }));

        if (!aliveRef.current) return;
        setAiResults(locations);
      } catch (err: unknown) {
        if (!aliveRef.current) return;
        const msg = err instanceof Error ? err.message : "";
        if (/429/.test(msg)) setAiError("Too many searches — please wait a moment.");
        else if (/402/.test(msg)) setAiError("AI credits exhausted.");
        else setAiError("Search failed");
        setAiResults([]);
      } finally {
        if (aliveRef.current) setIsSearching(false);
      }
    }, 300);
  }, []);

  const clearResults = useCallback(() => {
    setAiResults([]);
    setAiError(null);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { aiResults, isSearching, aiError, searchLocations, clearResults };
}
