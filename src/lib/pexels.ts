import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_PEXELS_IMAGE =
  "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&dpr=1";

const pexelsImageCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

export async function fetchPexelsImage(query: string): Promise<string | null> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return null;

  if (pexelsImageCache.has(trimmedQuery)) {
    return pexelsImageCache.get(trimmedQuery) ?? null;
  }
  if (inFlight.has(trimmedQuery)) {
    return inFlight.get(trimmedQuery)!;
  }

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("location-photo", {
        body: { label: trimmedQuery },
      });
      if (error) {
        pexelsImageCache.set(trimmedQuery, null);
        return null;
      }
      const image = (data as { imageUrl?: string | null })?.imageUrl ?? null;
      pexelsImageCache.set(trimmedQuery, image);
      return image;
    } catch {
      pexelsImageCache.set(trimmedQuery, null);
      return null;
    } finally {
      inFlight.delete(trimmedQuery);
    }
  })();

  inFlight.set(trimmedQuery, promise);
  return promise;
}
