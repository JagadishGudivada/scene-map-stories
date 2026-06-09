import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { db, upsertLocation } from "../_shared/store.ts";
import { getVertexAccessToken } from "../_shared/vertexAuth.ts";
import { generateWithFallback, SourceEvidence } from "../_shared/vertexCall.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("location-enrichment-vertex");

type EnrichmentRequest = {
  slug?: string;
  dryRun?: boolean;
};

type LocationEnrichmentPayload = {
  name?: string;
  city?: string;
  country?: string;
  flag?: string;
  lat?: number | null;
  lng?: number | null;
  description?: string;
  tagline?: string;
  bestTimeToVisit?: string;
  attractions?: Array<{ name: string; description?: string }>;
  nearbyFilmingSpots?: Array<{ name: string; titleHint?: string; description?: string }>;
  travelTips?: string[];
  heroImageQuery?: string;
  sources?: SourceEvidence[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const responseSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    city: { type: "STRING" },
    country: { type: "STRING" },
    flag: { type: "STRING" },
    lat: { type: "NUMBER", nullable: true },
    lng: { type: "NUMBER", nullable: true },
    description: { type: "STRING" },
    tagline: { type: "STRING" },
    bestTimeToVisit: { type: "STRING" },
    attractions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          description: { type: "STRING" },
        },
        required: ["name"],
      },
    },
    nearbyFilmingSpots: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          titleHint: { type: "STRING" },
          description: { type: "STRING" },
        },
        required: ["name"],
      },
    },
    travelTips: { type: "ARRAY", items: { type: "STRING" } },
    heroImageQuery: { type: "STRING" },
    sources: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          url: { type: "STRING" },
          title: { type: "STRING" },
          snippet: { type: "STRING" },
        },
        required: ["url"],
      },
    },
  },
  required: ["description"],
};

function buildPrompt(
  name: string,
  country?: string | null,
  existing?: { description?: string | null; tagline?: string | null; travelTips?: string[] }
): string {
  const existingLines: string[] = [];
  if (existing?.description) existingLines.push(`Existing description: ${existing.description}`);
  if (existing?.tagline) existingLines.push(`Existing tagline: ${existing.tagline}`);
  if (existing?.travelTips?.length) existingLines.push(`Existing travel tips: ${existing.travelTips.slice(0, 3).join(" | ")}`);
  return [
    "You are enriching a city/location page for a film-tourism website.",
    "Use grounded web retrieval. Prefer official tourism boards, Wikipedia, reputable travel publications, and film-location databases.",
    "Return STRICT JSON only matching the provided schema. No commentary, no markdown.",
    existingLines.length > 0 ? "Existing content — improve and extend it, do not simply repeat it:" : "",
    ...existingLines,
    "Rules:",
    "- description: 2-4 sentence editorial paragraph that mentions notable film/TV productions shot here when relevant",
    "- bestTimeToVisit: 1 sentence (season + reason)",
    "- attractions: 4-8 must-see places (non-film) with 1-line descriptions",
    "- nearbyFilmingSpots: 3-8 real filming spots in or near this city, with the title they appeared in",
    "- travelTips: 3-5 short practical tips",
    "- heroImageQuery: a 4-7 word stock-photo search query that yields a cinematic shot of the place",
    "- include lat/lng if confidently known; else null",
    "- include at least 2 source URLs",
    `Target location: ${name}${country ? `, ${country}` : ""}`,
  ].filter(Boolean).join("\n");
}

async function queryVerifiedNearbySpots(
  city: string | null,
  country: string | null
): Promise<Array<{ name: string; description?: string | null }>> {
  if (!city && !country) return [];
  let q = db().from("spots").select("name, description").limit(8);
  if (city) q = q.ilike("city", `%${city}%`);
  if (country) q = q.ilike("country", `%${country}%`);
  const { data } = await q;
  return Array.isArray(data) ? data : [];
}

async function resolveLocation(slug: string) {
  const { data } = await db()
    .from("locations")
    .select("id, slug, name, city, country, flag, lat, lng, hero_image_url, description, data")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as EnrichmentRequest;
    if (!body.slug) return json({ error: "slug required" }, 400);
    const row = await resolveLocation(body.slug);
    if (!row) return json({ error: "Location not found" }, 404);

    const accessToken = await getVertexAccessToken(req, "location-enrichment-vertex");
    const existing = (row.data && typeof row.data === "object") ? (row.data as Record<string, any>) : {};
    const result = await generateWithFallback<LocationEnrichmentPayload>(
      accessToken,
      {
        prompt: buildPrompt(
          row.name as string,
          row.country as string | null,
          {
            description: row.description as string | null,
            tagline: (existing.tagline as string | null) ?? null,
            travelTips: Array.isArray(existing.travelTips) ? existing.travelTips as string[] : [],
          }
        ),
        responseSchema,
      },
      "location-enrichment-vertex"
    );

    if (!result) return json({ error: "Vertex enrichment failed" }, 502);

    const payload = result.payload || {};

    const verifiedSpots = await queryVerifiedNearbySpots(
      (payload.city || row.city || row.name) as string | null,
      (payload.country || row.country) as string | null
    );

    const nearbyFilmingSpots = verifiedSpots.length > 0
      ? verifiedSpots.map((s) => ({ name: s.name, description: s.description || undefined }))
      : (payload.nearbyFilmingSpots || existing.nearbyFilmingSpots || []).map((s: any) => ({
          ...s,
          aiSuggested: true,
        }));

    const mergedData = {
      ...existing,
      name: payload.name || row.name,
      city: payload.city || row.city || row.name,
      country: payload.country || row.country,
      flag: payload.flag || existing.flag || row.flag,
      lat: payload.lat ?? row.lat,
      lng: payload.lng ?? row.lng,
      description: payload.description || row.description,
      tagline: payload.tagline || existing.tagline,
      bestTimeToVisit: payload.bestTimeToVisit || existing.bestTimeToVisit,
      attractions: payload.attractions || existing.attractions || [],
      nearbyFilmingSpots,
      travelTips: payload.travelTips || existing.travelTips || [],
      heroImageQuery: payload.heroImageQuery || existing.heroImageQuery,
      sources: payload.sources || result.evidence,
      enrichedAt: new Date().toISOString(),
      source: "vertex-grounded",
    };

    if (body.dryRun) {
      return json({ ok: true, dryRun: true, slug: row.slug, merged: mergedData });
    }

    await upsertLocation(row.slug as string, mergedData);

    return json({
      ok: true,
      slug: row.slug,
      grounded: result.grounded,
      evidenceCount: result.evidence.length,
      enriched: {
        description: !!mergedData.description,
        attractions: (mergedData.attractions as unknown[]).length,
        nearbyFilmingSpots: (mergedData.nearbyFilmingSpots as unknown[]).length,
        travelTips: (mergedData.travelTips as unknown[]).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("location-enrichment-vertex error", message);
    return json({ error: message }, 500);
  }
});
