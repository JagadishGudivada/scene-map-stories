/**
 * Shapes returned by the backend edge functions.
 * Typed once here so every call site stops using `any` at the boundary.
 * Fields are optional/loose on purpose: the AI responses are best-effort and
 * callers already normalise what they read.
 */

export type MediaType = "Movie" | "Series" | "Book";

/** `search-locations` */
export interface EdgeLocation {
  lat: number;
  lng: number;
  label: string;
  title: string;
  type?: string;
  image?: string | null;
  city?: string | null;
  country?: string | null;
  slug?: string | null;
}

export interface SearchLocationsResponse {
  locations?: EdgeLocation[];
  error?: string;
}

/** `search-titles` */
export interface EdgeTitle {
  title: string;
  year: number | string;
  type?: string;
  creator?: string | null;
  tmdb_id?: number | null;
  coverImage?: string | null;
  backdropImage?: string | null;
}

export interface SearchTitlesResponse {
  titles?: EdgeTitle[];
  error?: string;
}

/** `spot-details` */
export interface SpotDetailsResponse {
  name?: string;
  label?: string;
  city?: string | null;
  country?: string | null;
  lat?: number;
  lng?: number;
  image?: string | null;
  description?: string | null;
  funFacts?: string[];
  visitTips?: string[];
  titles?: { title: string; year?: number; type?: string }[];
  error?: string;
}

/** `passport-stamp-art` */
export interface PassportStampArtResponse {
  imageDataUrl?: string;
  error?: string;
}
