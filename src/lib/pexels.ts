const PEXELS_SEARCH_ENDPOINT = "https://api.pexels.com/v1/search";

export const DEFAULT_PEXELS_IMAGE =
  "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&dpr=1";

const pexelsImageCache = new Map<string, string | null>();

interface PexelsSearchResponse {
  photos?: Array<{
    src?: {
      landscape?: string;
      large2x?: string;
      large?: string;
      medium?: string;
    };
  }>;
}

export async function fetchPexelsImage(query: string): Promise<string | null> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return null;

  if (pexelsImageCache.has(trimmedQuery)) {
    return pexelsImageCache.get(trimmedQuery) ?? null;
  }

  const apiKey = import.meta.env.VITE_PEXELS_API_KEY;
  if (!apiKey) {
    pexelsImageCache.set(trimmedQuery, null);
    return null;
  }

  try {
    const url = new URL(PEXELS_SEARCH_ENDPOINT);
    url.searchParams.set("query", trimmedQuery);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("size", "large");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      pexelsImageCache.set(trimmedQuery, null);
      return null;
    }

    const data = (await response.json()) as PexelsSearchResponse;
    const photo = data.photos?.[0];
    const image = photo?.src?.landscape || photo?.src?.large2x || photo?.src?.large || photo?.src?.medium || null;

    pexelsImageCache.set(trimmedQuery, image);
    return image;
  } catch {
    pexelsImageCache.set(trimmedQuery, null);
    return null;
  }
}