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

function buildPrompt(
  name: string,
  city?: string | null,
  country?: string | null,
  existing?: { description?: string | null; funFacts?: string[]; visitTips?: string[] }
): string {
  const where = [city, country].filter(Boolean).join(", ");
  const existingLines: string[] = [];
  if (existing?.description) existingLines.push(`Existing description: ${existing.description}`);
  if (existing?.funFacts?.length) existingLines.push(`Existing fun facts: ${existing.funFacts.slice(0, 3).join(" | ")}`);
  if (existing?.visitTips?.length) existingLines.push(`Existing visit tips: ${existing.visitTips.slice(0, 3).join(" | ")}`);
  return [
    "You are enriching a single filming-spot page for a film-tourism website.",
    "Use grounded web retrieval. Prefer movie-locations sites, official tourism pages, Wikipedia, and reputable film publications.",
    "Return STRICT JSON only matching the provided schema. No commentary, no markdown.",
    existingLines.length > 0 ? "Existing content — improve and extend it, do not simply repeat it:" : "",
    ...existingLines,
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
  ].filter(Boolean).join("\n");
}

async function linkScenesShotHere(
  spotId: string,
  scenes: Array<{ title: string; year?: number }>
): Promise<number> {
  let linked = 0;
  for (const scene of scenes) {
    const titleName = scene.title?.trim();
    if (!titleName) continue;
    let q = db().from("titles").select("id").ilike("title", `%${titleName}%`).limit(1);
    if (scene.year) q = q.eq("year", scene.year);
    const { data: titleRow } = await q.maybeSingle();
    if (!titleRow?.id) continue;
    const { error } = await db().from("title_spots").upsert(
      { title_id: titleRow.id, spot_id: spotId, role: "filming" },
      { onConflict: "title_id,spot_id" }
    );
    if (!error) linked++;
  }
  return linked;
}

async function resolveSpot(slug: string) {
  const { data } = await db()
    .from("spots")
    .select("id, slug, name, address, city, country, flag, lat, lng, image_url, description, fun_facts, visit_tips, data")
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
          row.country as string | null,
          {
            description: row.description as string | null,
            funFacts: Array.isArray(row.fun_facts) ? row.fun_facts as string[] : [],
            visitTips: Array.isArray(row.visit_tips) ? row.visit_tips as string[] : [],
          }
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

    const scenes = Array.isArray(merged.scenesShotHere)
      ? merged.scenesShotHere as Array<{ title: string; year?: number }>
      : [];
    const titlesLinked = scenes.length > 0
      ? await linkScenesShotHere(row.id as string, scenes)
      : 0;

    return json({
      ok: true,
      slug: row.slug,
      grounded: result.grounded,
      evidenceCount: result.evidence.length,
      enriched: {
        description: !!merged.description,
        scenesShotHere: (merged.scenesShotHere as unknown[]).length,
        titlesLinked,
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
