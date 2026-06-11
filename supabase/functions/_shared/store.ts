import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

// Prefer new opaque secret key (SUPABASE_SECRET_KEYS is auto-injected by the platform).
// Falls back to legacy JWT-based service role key for local dev / projects not yet migrated.
export function getServiceKey(): string {
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysJson) {
    return (JSON.parse(secretKeysJson) as Record<string, string>)["default"];
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

let _client: ReturnType<typeof createClient> | null = null;
export function db() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, getServiceKey(), {
      auth: { persistSession: false },
    });
  }
  return _client;
}

// ============ TITLES ============
export async function getTitle(slug: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await db()
      .from("titles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return hydrateTitle(data);
  } catch (e) {
    console.error("getTitle error", e);
    return null;
  }
}

export async function upsertTitle(slug: string, payload: Record<string, any>) {
  try {
    const row = {
      slug,
      title: String(payload.title ?? ""),
      year: payload.year ? Number(payload.year) : null,
      type: payload.type || "Movie",
      synopsis: payload.synopsis ?? null,
      genres: Array.isArray(payload.genres) ? payload.genres : [],
      rating: payload.rating ?? null,
      poster_url: payload.coverImage ?? null,
      backdrop_url: payload.backdropImage ?? null,
      tmdb_id: payload.tmdb_id ?? null,
      data: payload,
      source: payload.source || "ai",
      last_fetched_at: new Date().toISOString(),
      ...(payload.enrichedAt ? { enriched_at: new Date(payload.enrichedAt as string).toISOString() } : {}),
    };
    await db().from("titles").upsert(row, { onConflict: "slug" });
  } catch (e) {
    console.error("upsertTitle error", e);
  }
}

function hydrateTitle(row: any): Record<string, unknown> {
  const base = (row.data && typeof row.data === "object") ? row.data : {};
  return {
    ...base,
    title: row.title,
    year: row.year,
    type: row.type,
    synopsis: row.synopsis,
    genres: row.genres,
    rating: row.rating,
    coverImage: row.poster_url,
    backdropImage: row.backdrop_url,
  };
}

// ============ LOCATIONS ============
export async function getLocation(slug: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await db()
      .from("locations")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return hydrateLocation(data);
  } catch (e) {
    console.error("getLocation error", e);
    return null;
  }
}

export async function upsertLocation(slug: string, payload: Record<string, any>) {
  try {
    const row = {
      slug,
      name: String(payload.name ?? ""),
      city: payload.city ?? payload.name ?? null,
      country: payload.country ?? null,
      flag: payload.flag ?? null,
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      hero_image_url: payload.coverImage ?? payload.heroImage ?? null,
      description: payload.description ?? payload.tagline ?? null,
      data: payload,
      source: payload.source || "ai",
      last_fetched_at: new Date().toISOString(),
      ...(payload.enrichedAt ? { enriched_at: new Date(payload.enrichedAt as string).toISOString() } : {}),
    };
    await db().from("locations").upsert(row, { onConflict: "slug" });
  } catch (e) {
    console.error("upsertLocation error", e);
  }
}

function hydrateLocation(row: any): Record<string, unknown> {
  const base = (row.data && typeof row.data === "object") ? row.data : {};
  return {
    ...base,
    name: row.name,
    country: row.country,
    flag: row.flag,
    lat: row.lat,
    lng: row.lng,
    coverImage: row.hero_image_url,
  };
}

// ============ SPOTS ============
export async function getSpot(slug: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await db()
      .from("spots")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return hydrateSpot(data);
  } catch (e) {
    console.error("getSpot error", e);
    return null;
  }
}

export async function upsertSpot(slug: string, payload: Record<string, any>) {
  try {
    const row = {
      slug,
      name: String(payload.name ?? ""),
      address: payload.address ?? null,
      city: payload.city ?? null,
      country: payload.country ?? null,
      flag: payload.flag ?? null,
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      image_url: payload.image ?? null,
      description: payload.description ?? null,
      fun_facts: Array.isArray(payload.funFacts) ? payload.funFacts : [],
      visit_tips: Array.isArray(payload.visitTips) ? payload.visitTips : [],
      data: payload,
      source: payload.source || "ai",
      last_fetched_at: new Date().toISOString(),
      ...(payload.enrichedAt ? { enriched_at: new Date(payload.enrichedAt as string).toISOString() } : {}),
    };
    await db().from("spots").upsert(row, { onConflict: "slug" });
  } catch (e) {
    console.error("upsertSpot error", e);
  }
}

function hydrateSpot(row: any): Record<string, unknown> {
  const base = (row.data && typeof row.data === "object") ? row.data : {};
  return {
    ...base,
    name: row.name,
    address: row.address,
    city: row.city,
    country: row.country,
    flag: row.flag,
    lat: row.lat,
    lng: row.lng,
    image: row.image_url,
    description: row.description,
    funFacts: row.fun_facts,
    visitTips: row.visit_tips,
  };
}
