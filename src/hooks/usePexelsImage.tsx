import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function fetchOnce(label: string, city?: string, country?: string): Promise<string | null> {
  const key = [label, city, country].filter(Boolean).join("|");
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("location-photo", {
        body: { label, city, country },
      });
      if (error) throw error;
      const url = (data as { imageUrl?: string | null })?.imageUrl ?? null;
      cache.set(key, url);
      return url;
    } catch {
      cache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function usePexelsImage(
  label: string,
  city?: string,
  country?: string,
  fallback?: string
): string | undefined {
  const [src, setSrc] = useState<string | undefined>(() => {
    const key = [label, city, country].filter(Boolean).join("|");
    return cache.get(key) ?? fallback;
  });
  useEffect(() => {
    if (!label) return;
    let alive = true;
    fetchOnce(label, city, country).then((url) => {
      if (alive && url) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [label, city, country]);
  return src;
}
