import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { db, upsertSpot } from "../_shared/store.ts";
import { getVertexAccessToken } from "../_shared/vertexAuth.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("title-enrichment-vertex");

type EnrichmentRequest = {
  slug?: string;
  title?: string;
  year?: number;
  dryRun?: boolean;
  maxLocations?: number;
};

type SourceEvidence = {
  url: string;
  title?: string;
  snippet?: string;
};

type RawLocationCandidate = {
  label?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  confidence?: number;
  reason?: string;
  sources?: SourceEvidence[];
};

type VertexEnrichmentPayload = {
  title?: string;
  year?: number;
  locations?: RawLocationCandidate[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GCP_PROJECT_ID = Deno.env.get("GCP_PROJECT_ID") || "project-13ea7804-7f26-4260-b11";
const GCP_LOCATION = Deno.env.get("GCP_LOCATION") || "us-central1";
const VERTEX_MODEL = Deno.env.get("VERTEX_MODEL_ENRICHMENT") || "gemini-2.5-flash";
const VERTEX_TIMEOUT_MS = Number(Deno.env.get("VERTEX_TIMEOUT_MS") || "30000");
const VERTEX_MAX_OUTPUT_TOKENS = Number(Deno.env.get("VERTEX_MAX_OUTPUT_TOKENS") || "4096");
const VERTEX_GROUNDING_ENABLED = !["0", "false", "no", "off"].includes(
  (Deno.env.get("VERTEX_GROUNDING_ENABLED") || "true").toLowerCase()
);
const DEFAULT_MAX_LOCATIONS = Number(Deno.env.get("ENRICHMENT_MAX_LOCATIONS") || "12");
const HARD_MAX_LOCATIONS = Number(Deno.env.get("ENRICHMENT_HARD_MAX_LOCATIONS") || "30");
const TIMEOUT_RETRY_MIN_LOCATIONS = Number(Deno.env.get("ENRICHMENT_TIMEOUT_RETRY_MIN_LOCATIONS") || "6");
const AUTOPUBLISH_THRESHOLD = Number(Deno.env.get("ENRICHMENT_AUTOPUBLISH_THRESHOLD") || "0.78");
const SYSTEM_USER_ID = Deno.env.get("ENRICHMENT_SYSTEM_USER_ID") || "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeLocationLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_LOCATIONS;
  return Math.max(1, Math.min(HARD_MAX_LOCATIONS, Math.floor(parsed)));
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("timed out") || msg.includes("signal timed out");
}

function isParseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("parse json") || msg.includes("could not parse json");
}

function parseJsonFromText(content: string): VertexEnrichmentPayload {
  const trimmed = content.trim();
  const deFenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(deFenced);
  } catch {
    const firstBrace = deFenced.indexOf("{");
    const lastBrace = deFenced.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(deFenced.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Could not parse JSON response from Vertex");
  }
}

async function callVertexGenerate(
  accessToken: string,
  prompt: string,
  withGrounding: boolean
): Promise<{ payload: VertexEnrichmentPayload; evidence: SourceEvidence[]; grounded: boolean }> {
  if (!GCP_PROJECT_ID) throw new Error("GCP_PROJECT_ID is not configured");

  const url = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;

  const requestBody: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: VERTEX_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          year: { type: "NUMBER" },
          locations: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                label: { type: "STRING" },
                city: { type: "STRING" },
                country: { type: "STRING" },
                lat: { type: "NUMBER", nullable: true },
                lng: { type: "NUMBER", nullable: true },
                confidence: { type: "NUMBER" },
                reason: { type: "STRING" },
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
              required: ["label", "confidence"],
            },
          },
        },
        required: ["locations"],
      },
    },
  };

  if (withGrounding) {
    requestBody.tools = [{ googleSearch: {} }];
  }

  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(VERTEX_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      lastStatus = res.status;
      lastBody = await res.text();

      if (res.status === 429) throw new Error("Vertex rate-limited the request");
      if (res.status === 402) throw new Error("Vertex credits exhausted");
      if (res.status >= 500 && attempt === 0) continue;

      if (withGrounding && res.status === 400) {
        throw new Error(`Vertex grounding request rejected: ${lastBody.slice(0, 300)}`);
      }

      throw new Error(`Vertex request failed (${res.status}): ${lastBody.slice(0, 300)}`);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts;
    const textPart = Array.isArray(parts)
      ? parts.find((part: unknown) => typeof (part as { text?: string })?.text === "string")
      : null;

    const text = typeof textPart?.text === "string" ? textPart.text : "";
    if (!text) throw new Error("Vertex returned an empty response payload");

    const parsed = parseJsonFromText(text);

    const chunks = Array.isArray(candidate?.groundingMetadata?.groundingChunks)
      ? candidate.groundingMetadata.groundingChunks
      : [];

    const evidence: SourceEvidence[] = chunks
      .map((chunk: any) => {
        const web = chunk?.web || {};
        const uri = typeof web?.uri === "string" ? web.uri : "";
        if (!uri) return null;
        return {
          url: uri,
          title: typeof web?.title === "string" ? web.title : undefined,
        };
      })
      .filter(Boolean);

    return { payload: parsed, evidence, grounded: withGrounding };
  }

  throw new Error(`Vertex request failed (${lastStatus}): ${lastBody.slice(0, 300)}`);
}

function buildPrompt(title: string, maxLocations: number, year?: number): string {
  return [
    "You are enriching one movie/series title for movie scout website with real filming locations.",
    "Use internet-grounded web retrieval to find real filming locations and return strict JSON only.",
    "Prioritize reliable sources including movie-locations style websites, official tourism pages, Wikipedia, and reputable film publications.",
    "Return JSON schema:",
    '{"title":"string","year":number,"locations":[{"label":"string","city":"string","country":"string","lat":number,"lng":number,"confidence":number,"reason":"string","sources":[{"url":"https://...","title":"string","snippet":"string"}]}]}',
    "Rules:",
    "- return a single valid JSON object only (no markdown, no code fences, no commentary)",
    "- confidence must be in [0,1]",
    "- include at least one source URL for each location",
    "- use null for unknown lat/lng",
    `- return at most ${maxLocations} locations`,
    "- rank by confidence and include only the most credible places",
    `Target title: ${title}`,
    year ? `Target year: ${year}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function resolveTargetTitle(input: EnrichmentRequest): Promise<{ id: string; slug: string; title: string; year: number | null } | null> {
  const client = db();
  const slugAsTitle = (input.slug || "").replace(/-/g, " ").trim();

  if (input.slug && typeof input.slug === "string") {
    const normalized = slugify(input.slug);
    const { data } = await client
      .from("titles")
      .select("id, slug, title, year")
      .eq("slug", normalized)
      .maybeSingle();
    if (data) return data;
  }

  if (input.title && typeof input.title === "string") {
    let q = client
      .from("titles")
      .select("id, slug, title, year")
      .ilike("title", `%${input.title.trim()}%`)
      .order("year", { ascending: false })
      .limit(1);

    if (typeof input.year === "number") {
      q = q.eq("year", input.year);
    }

    const { data, error } = await q.maybeSingle();
    if (error) {
      log.error("title-enrichment-vertex resolve title error", error);
      return null;
    }

    if (data) return data;
  }

  if (slugAsTitle) {
    const { data, error } = await client
      .from("titles")
      .select("id, slug, title, year")
      .ilike("title", `%${slugAsTitle}%`)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      log.error("title-enrichment-vertex resolve by slug text error", error);
      return null;
    }

    if (data) return data;
  }

  return null;
}

async function insertPendingSuggestion(params: {
  titleSlug: string;
  titleName: string;
  candidate: RawLocationCandidate;
}): Promise<{ inserted: boolean; reason?: string }> {
  if (!SYSTEM_USER_ID) {
    return {
      inserted: false,
      reason: "ENRICHMENT_SYSTEM_USER_ID not configured; pending suggestion not persisted",
    };
  }

  const locationName = (params.candidate.label || "").trim();
  if (!locationName) return { inserted: false, reason: "Candidate label missing" };

  const notes = [
    params.candidate.reason ? `Reason: ${params.candidate.reason}` : "",
    Array.isArray(params.candidate.sources)
      ? `Sources: ${params.candidate.sources
          .map((s) => s?.url)
          .filter((v): v is string => typeof v === "string" && v.length > 0)
          .slice(0, 3)
          .join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { error } = await db().from("location_suggestions").insert({
    user_id: SYSTEM_USER_ID,
    title_slug: params.titleSlug,
    title_name: params.titleName,
    location_name: locationName,
    description: params.candidate.reason || null,
    status: "pending",
    ai_notes: notes || null,
  });

  if (error) {
    log.error("title-enrichment-vertex pending suggestion insert error", error);
    return { inserted: false, reason: error.message };
  }

  return { inserted: true };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as EnrichmentRequest;
    const dryRun = body.dryRun === true;
    const requestedLocationLimit = normalizeLocationLimit(body.maxLocations);

    if ((!body.slug || typeof body.slug !== "string") && (!body.title || typeof body.title !== "string")) {
      return json({ error: "Provide slug or title" }, 400);
    }

    const resolved = await resolveTargetTitle(body);
    if (!resolved) {
      return json({
        error: "Title not found",
        hint: "Provide an existing titles.slug or a closer title query",
      }, 404);
    }

    const accessToken = await getVertexAccessToken(req, "title-enrichment-vertex");

    let generated: { payload: VertexEnrichmentPayload; evidence: SourceEvidence[]; grounded: boolean } | null = null;
    let usedLocationLimit = requestedLocationLimit;

    try {
      const prompt = buildPrompt(resolved.title, usedLocationLimit, resolved.year ?? undefined);
      generated = await callVertexGenerate(accessToken, prompt, VERTEX_GROUNDING_ENABLED);
    } catch (firstError) {
      let fallbackError: unknown = firstError;

      if (VERTEX_GROUNDING_ENABLED) {
        try {
          const prompt = buildPrompt(resolved.title, usedLocationLimit, resolved.year ?? undefined);
          log.warn("title-enrichment-vertex grounding attempt failed, retrying without grounding", { detail: firstError });
          generated = await callVertexGenerate(accessToken, prompt, false);
          fallbackError = null;
        } catch (secondError) {
          fallbackError = secondError;
        }
      }

      if (fallbackError) {
        if (isTimeoutError(fallbackError) && usedLocationLimit > TIMEOUT_RETRY_MIN_LOCATIONS) {
          usedLocationLimit = Math.max(TIMEOUT_RETRY_MIN_LOCATIONS, Math.floor(usedLocationLimit / 2));
          const retryPrompt = buildPrompt(resolved.title, usedLocationLimit, resolved.year ?? undefined);
          console.warn(`title-enrichment-vertex timeout fallback with smaller location limit: ${usedLocationLimit}`);
          generated = await callVertexGenerate(accessToken, retryPrompt, false);
        } else if (isParseError(fallbackError)) {
          const retryPrompt = buildPrompt(resolved.title, usedLocationLimit, resolved.year ?? undefined);
          console.warn("title-enrichment-vertex parse fallback retry without grounding");
          generated = await callVertexGenerate(accessToken, retryPrompt, false);
        } else {
          throw fallbackError;
        }
      }
    }

    if (!generated) {
      throw new Error("Vertex enrichment did not produce a response");
    }

    const rawCandidates = Array.isArray(generated.payload.locations)
      ? generated.payload.locations.slice(0, usedLocationLimit)
      : [];

    const seen = new Set<string>();
    const accepted: Array<Record<string, unknown>> = [];
    const pending: Array<Record<string, unknown>> = [];
    const skipped: Array<Record<string, unknown>> = [];

    for (const candidate of rawCandidates) {
      const label = (candidate.label || "").trim();
      if (!label) continue;

      const confidence = clampConfidence(candidate.confidence);
      const city = typeof candidate.city === "string" ? candidate.city.trim() : "";
      const country = typeof candidate.country === "string" ? candidate.country.trim() : "";
      const lat = typeof candidate.lat === "number" ? candidate.lat : null;
      const lng = typeof candidate.lng === "number" ? candidate.lng : null;
      const reason = typeof candidate.reason === "string" ? candidate.reason.trim() : "";
      const sources = Array.isArray(candidate.sources)
        ? candidate.sources.filter((source) => typeof source?.url === "string" && source.url.length > 0)
        : [];

      const key = `${slugify(label)}|${city.toLowerCase()}|${country.toLowerCase()}|${lat ?? ""}|${lng ?? ""}`;
      if (seen.has(key)) {
        skipped.push({ label, reason: "duplicate-candidate" });
        continue;
      }
      seen.add(key);

      const spotSlug = slugify(`${label} ${city} ${country}`.trim());
      const candidateRecord = {
        label,
        city,
        country,
        lat,
        lng,
        confidence,
        reason,
        spotSlug,
        sources,
      };

      if (confidence < AUTOPUBLISH_THRESHOLD) {
        const persisted = dryRun
          ? { inserted: false, reason: "dryRun=true" }
          : await insertPendingSuggestion({
              titleSlug: resolved.slug,
              titleName: resolved.title,
              candidate,
            });

        pending.push({ ...candidateRecord, pendingPersisted: persisted.inserted, pendingReason: persisted.reason });
        continue;
      }

      if (dryRun) {
        accepted.push({ ...candidateRecord, linked: false, dryRun: true });
        continue;
      }

      await upsertSpot(spotSlug, {
        name: label,
        city: city || null,
        country: country || null,
        lat,
        lng,
        description: reason || null,
        source: "vertex-grounded",
        image: null,
      });

      const { data: spotRow, error: spotReadError } = await db()
        .from("spots")
        .select("id")
        .eq("slug", spotSlug)
        .maybeSingle();

      if (spotReadError || !spotRow?.id) {
        log.error("title-enrichment-vertex unable to resolve spot id", spotReadError);
        skipped.push({ label, reason: "spot-id-not-found-after-upsert" });
        continue;
      }

      const { error: linkError } = await db().from("title_spots").upsert(
        {
          title_id: resolved.id,
          spot_id: spotRow.id,
          role: "filming",
        },
        { onConflict: "title_id,spot_id" }
      );

      if (linkError) {
        log.error("title-enrichment-vertex title_spots upsert error", linkError);
        skipped.push({ label, reason: `link-failed:${linkError.message}` });
        continue;
      }

      accepted.push({ ...candidateRecord, linked: true });
    }

    return json({
      ok: true,
      dryRun,
      grounded: generated.grounded,
      model: VERTEX_MODEL,
      threshold: AUTOPUBLISH_THRESHOLD,
      requestedLocationLimit,
      usedLocationLimit,
      title: {
        id: resolved.id,
        slug: resolved.slug,
        title: resolved.title,
        year: resolved.year,
      },
      summary: {
        totalCandidates: rawCandidates.length,
        acceptedCount: accepted.length,
        pendingCount: pending.length,
        skippedCount: skipped.length,
      },
      accepted,
      pending,
      skipped,
      groundingEvidence: generated.evidence.slice(0, 20),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("title-enrichment-vertex error", message);
    return json({ error: message }, 500);
  }
});
