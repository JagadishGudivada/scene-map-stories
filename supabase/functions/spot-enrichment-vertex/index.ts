import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { db, upsertSpot } from "../_shared/store.ts";
import { getVertexAccessToken } from "../_shared/vertexAuth.ts";
import { generateWithFallback, SourceEvidence } from "../_shared/vertexCall.ts";

type EnrichmentRequest = {
  slug?: string;
  dryRun?: boolean;
};

type SpotEnrichmentPayload = {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  flag?: string;
  lat?: number | null;
  lng?: number | null;
  description?: string;
  scenesShotHere?: Array<{ title: string; year?: number; scene?: string }>;
  funFacts?: string[];
  visitTips?: string[];
  bestTimeOfDay?: string;
  accessibilityNotes?: string;
  imageQuery?: string;
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
    address: { type: "STRING" },
    city: { type: "STRING" },
    country: { type: "STRING" },
    flag: { type: "STRING" },
    lat: { type: "NUMBER", nullable: true },
    lng: { type: "NUMBER", nullable: true },
    description: { type: "STRING" },
    scenesShotHere: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          year: { type: "NUMBER" },
          scene: { type: "STRING" },
        },
        required: ["title"],
      },
    },
    funFacts: { type: "ARRAY", items: { type: "STRING" } },
    visitTips: { type: "ARRAY", items: { type: "STRING" } },
    bestTimeOfDay: { type: "STRING" },
    accessibilityNotes: { type: "STRING" },
    imageQuery: { type: "STRING" },
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

function buildPrompt(name: string, city?: string | null, country?: string | null): string {
  const where = [city, country].filter(Boolean).join(", ");
  return [
    "You are enriching a single filming-spot page for a film-tourism website.",
    "Use grounded web retrieval. Prefer movie-locations sites, official tourism pages, Wikipedia, and reputable film publications.",
    "Return STRICT JSON only matching the provided schema. No commentary, no markdown.",
    "Rules:",
    "- description: 2-4 sentence editorial paragraph about what was filmed here and why this spot is iconic",
    "- scenesShotHere: 1-6 real titles where this spot appears, with the scene description if known",
    "- funFacts: 3-6 short trivia/behind-the-scenes facts (one sentence each)",
    "- visitTips: 3-6 practical tips for visitors (transport, ticketing, photo angles, etc.)",
    "- bestTimeOfDay: 1 sentence (lighting/crowds reason)",
    "- accessibilityNotes: 1 sentence on accessibility/restrictions",
    "- include lat/lng and street address if confidently known; else null",
    "- imageQuery: a 4-7 word stock-photo search query for a cinematic shot",
    "- include at least 2 source URLs",
    `Target spot: ${name}${where ? ` (${where})` : ""}`,
  ].join("\n");
}

async function resolveSpot(slug: string) {
  const { data } = await db()
    .from("spots")
    .select("id, slug, name, address, city, country, lat, lng, image_url, description, fun_facts, visit_tips, data")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as EnrichmentRequest;
    if (!body.slug) return json({ error: "slug required" }, 400);
    const row = await resolveSpot(body.slug);
    if (!row) return json({ error: "Spot not found" }, 404);

    const accessToken = await getVertexAccessToken(req, "spot-enrichment-vertex");
    const result = await generateWithFallback<SpotEnrichmentPayload>(
      accessToken,
      {
        prompt: buildPrompt(
          row.name as string,
          row.city as string | null,
          row.country as string | null
        ),
        responseSchema,
      },
      "spot-enrichment-vertex"
    );

    if (!result) return json({ error: "Vertex enrichment failed" }, 502);

    const payload = result.payload || {};
    const existing = (row.data && typeof row.data === "object") ? (row.data as Record<string, any>) : {};

    const merged = {
      ...existing,
      name: payload.name || row.name,
      address: payload.address || row.address,
      city: payload.city || row.city,
      country: payload.country || row.country,
      flag: payload.flag || existing.flag || row.flag,
      lat: payload.lat ?? row.lat,
      lng: payload.lng ?? row.lng,
      description: payload.description || row.description,
      scenesShotHere: payload.scenesShotHere || existing.scenesShotHere || [],
      funFacts: payload.funFacts || row.fun_facts || [],
      visitTips: payload.visitTips || row.visit_tips || [],
      bestTimeOfDay: payload.bestTimeOfDay || existing.bestTimeOfDay,
      accessibilityNotes: payload.accessibilityNotes || existing.accessibilityNotes,
      imageQuery: payload.imageQuery || existing.imageQuery,
      sources: payload.sources || result.evidence,
      enrichedAt: new Date().toISOString(),
      source: "vertex-grounded",
    };

    if (body.dryRun) {
      return json({ ok: true, dryRun: true, slug: row.slug, merged });
    }

    await upsertSpot(row.slug as string, merged);

    return json({
      ok: true,
      slug: row.slug,
      grounded: result.grounded,
      evidenceCount: result.evidence.length,
      enriched: {
        description: !!merged.description,
        scenesShotHere: (merged.scenesShotHere as unknown[]).length,
        funFacts: (merged.funFacts as unknown[]).length,
        visitTips: (merged.visitTips as unknown[]).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("spot-enrichment-vertex error", message);
    return json({ error: message }, 500);
  }
});
