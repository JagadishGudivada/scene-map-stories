import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCached, normalizeKey } from "../_shared/aiCache.ts";
import { getVertexAccessToken } from "../_shared/vertexAuth.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("passport-stamp-art");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FN = "passport-stamp-art";
const TTL_DAYS = 30;
const STYLE_VERSION = "v3-vertex-ai";
const GCP_PROJECT_ID = Deno.env.get("GCP_PROJECT_ID") || "project-13ea7804-7f26-4260-b11";
const GCP_LOCATION = Deno.env.get("GCP_LOCATION") || "us-central1";

type Tier = "bronze" | "silver" | "gold";

type RequestBody = {
  country?: string;
  countryCode?: string;
  tier?: Tier;
  earnedAt?: string;
  generate?: boolean;
};

type CachedPayload = {
  imageDataUrl: string | null;
  prompt: string | null;
  model: string | null;
  generatedAt: string | null;
  cacheHit?: boolean;
};

type ImagenAttemptResult = {
  imageDataUrl: string | null;
  status: number;
  quotaExceeded: boolean;
  errorText?: string;
};

async function generateWithImagen(
  prompt: string,
  accessToken: string,
  model: string
): Promise<ImagenAttemptResult> {
  const url = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/${model}:predict`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1", safetyFilterLevel: "block_few" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`Imagen ${model} ${res.status}:`, text.slice(0, 400));
    const quotaExceeded =
      res.status === 429 &&
      /quota exceeded|resource_exhausted|online_prediction_requests_per_base_model/i.test(text);
    return {
      imageDataUrl: null,
      status: res.status,
      quotaExceeded,
      errorText: text.slice(0, 400),
    };
  }

  const data = await res.json();
  const pred = data?.predictions?.[0];
  if (!pred?.bytesBase64Encoded) {
    return {
      imageDataUrl: null,
      status: 200,
      quotaExceeded: false,
      errorText: "No bytesBase64Encoded in prediction payload",
    };
  }
  return {
    imageDataUrl: `data:${pred.mimeType || "image/png"};base64,${pred.bytesBase64Encoded}`,
    status: 200,
    quotaExceeded: false,
  };
}

function db() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function parseTier(v: unknown): Tier {
  if (v === "silver" || v === "gold") return v;
  return "bronze";
}

function countryMotif(country: string, code: string): string {
  const k = country.toLowerCase();
  if (k.includes("united kingdom") || k === "uk") return "Big Ben and UK heraldic motifs";
  if (k.includes("france")) return "Eiffel Tower and fleur-de-lis motifs";
  if (k.includes("italy")) return "Roman colonnades and laurel motifs";
  if (k.includes("japan")) return "Mount Fuji and rising-sun motifs";
  if (k.includes("india")) return "heritage palace silhouette and lotus motifs";
  if (k.includes("united states") || code === "US") return "Liberty torch and star motifs";
  if (k.includes("canada")) return "maple leaf and Rocky Mountains motifs";
  if (k.includes("australia")) return "Sydney Opera House and kangaroo motifs";
  if (k.includes("brazil")) return "Christ the Redeemer and tropical motifs";
  if (k.includes("spain")) return "Sagrada Familia and flamenco motifs";
  return `${country} travel emblem motifs`;
}

function buildPrompt(country: string, countryCode: string, tier: Tier, earnedAtLabel: string): string {
  const details = [
    `Country: "${country}"`,
    `ISO country code: ${countryCode}`,
    `Tier: ${tier}`,
    `Earned year label: ${earnedAtLabel}`,
    `Motif hint: ${countryMotif(country, countryCode)}`,
  ];

  const tierColor =
    tier === "gold"
      ? "rich antique gold, deep crimson and amber palette, ornate full illustration"
      : tier === "silver"
      ? "cool silver-blue, teal and cyan palette, ornamental design"
      : "warm copper, burnt orange and navy palette, classic design";

  return [
    "Use the following known metadata to design the badge before generating artwork:",
    details.join(". "),
    "Create a single passport stamp illustration as a real vintage travel emblem.",
    "Use the metadata as strong grounding context and keep the composition centered and square.",
    "The design must have a circular scalloped wax-seal edge, engraved line art, distressed ink texture, and a parchment-paper feel.",
    `Center illustration: ${countryMotif(country, countryCode)}.`,
    `Top arc text: ${country.toUpperCase()}.`,
    "Inner arc text: SAREVISTA FILMING SCOUT.",
    `Bottom arc text: MEMORABLE JOURNEYS • ${earnedAtLabel}.`,
    `Palette direction: ${tierColor}.`,
    "CRITICAL: generate a naturally colorful badge directly from model output; do not make it monochrome or single-color.",
    "Fill the square frame with the badge and keep empty margin minimal.",
    "No watermark, no extra UI, no photo background, and no duplicate badges.",
  ].join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const country = clean(body.country);
    const countryCode = clean(body.countryCode).toUpperCase() || "UN";
    const tier = parseTier(body.tier);
    const earnedAt = clean(body.earnedAt);
    const generateOnMiss = body.generate === true;

    if (!country) return json({ error: "country is required" }, 400);

    const earnedYear = (() => {
      const d = new Date(earnedAt);
      if (Number.isNaN(d.getTime())) return new Date().getFullYear();
      return d.getFullYear();
    })();

    const cacheKey = normalizeKey(`${STYLE_VERSION}|${country}|${countryCode}|${tier}|${earnedYear}`);
    const cached = await getCached<CachedPayload>(FN, cacheKey);
    if (cached?.imageDataUrl) return json({ ...cached, cacheHit: true });

    if (!generateOnMiss) {
      return json({ imageDataUrl: null, prompt: null, model: null, generatedAt: null, cacheHit: false });
    }

    const prompt = buildPrompt(country, countryCode, tier, `EST. ${earnedYear}`);

    let accessToken: string;
    try {
      accessToken = await getVertexAccessToken(req, "passport-stamp-art");
    } catch (authErr) {
      const msg = authErr instanceof Error ? authErr.message : String(authErr);
      log.error("passport-stamp-art Vertex auth error:", msg);
      return json({ error: "Vertex AI authentication failed", detail: msg }, 500);
    }

    const imagenModels =
      Deno.env
        .get("VERTEX_IMAGEN_MODELS")
        ?.split(",")
        .map((m) => m.trim())
        .filter(Boolean) || ["imagen-3.0-fast-generate-001", "imagen-3.0-generate-002"];

    let imageDataUrl: string | null = null;
    let resolvedModel: string | null = null;
    const attempts: Array<{ model: string; status: number; quotaExceeded: boolean }> = [];

    for (const model of imagenModels) {
      const attempt = await generateWithImagen(prompt, accessToken, model);
      attempts.push({ model, status: attempt.status, quotaExceeded: attempt.quotaExceeded });
      imageDataUrl = attempt.imageDataUrl;
      if (imageDataUrl) {
        resolvedModel = model;
        break;
      }
    }

    if (!imageDataUrl) {
      const quotaOnlyFailure = attempts.length > 0 && attempts.every((a) => a.quotaExceeded);
      if (quotaOnlyFailure) {
        console.warn("passport-stamp-art: Vertex quota exhausted across configured models", {
          attempts,
        });
        return json(
          {
            error: "Vertex Imagen quota exceeded",
            detail:
              "Quota exceeded for one or more configured Imagen models. Retry later or request Vertex quota increase.",
            attempts,
          },
          429
        );
      }

      log.error("passport-stamp-art: no image returned from Imagen models", { attempts });
      return json({ error: "No image returned by Vertex AI", attempts }, 502);
    }

    const payload: CachedPayload = {
      imageDataUrl,
      prompt,
      model: resolvedModel,
      generatedAt: new Date().toISOString(),
    };

    const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: upsertError } = await db().from("ai_cache").upsert(
      {
        function_name: FN,
        cache_key: cacheKey,
        payload,
        expires_at: expiresAt,
      },
      { onConflict: "function_name,cache_key" }
    );

    if (upsertError) {
      log.error("passport-stamp-art cache upsert error", upsertError);
    }

    return json(payload);
  } catch (error) {
    log.error("passport-stamp-art error", error);
    return json({ error: String(error instanceof Error ? error.message : error) }, 500);
  }
});
