import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleAuth } from "npm:google-auth-library@9";
import { getCached, normalizeKey } from "../_shared/aiCache.ts";

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

async function getVertexAccessToken(req: Request): Promise<string> {
  const credentialsJson = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS_JSON");
  if (!credentialsJson) throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON not configured");

  const credentials = JSON.parse(credentialsJson);

  if (credentials?.type === "external_account") {
    const auth = new GoogleAuth({
      credentials,
      identityPoolTokenProvider: {
        getFederatedToken: async () => {
          const token = req.headers.get("Authorization")?.replace("Bearer ", "");
          if (!token) throw new Error("No Supabase token found");
          return token;
        },
      },
    });

    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    if (tokenRes?.token) return tokenRes.token;
    throw new Error("GoogleAuth returned an empty access token");
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  if (!tokenRes?.token) throw new Error("GoogleAuth returned an empty access token");
  return tokenRes.token;
}

async function generateWithImagen(prompt: string, accessToken: string, model: string): Promise<string | null> {
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
    return null;
  }

  const data = await res.json();
  const pred = data?.predictions?.[0];
  if (!pred?.bytesBase64Encoded) return null;
  return `data:${pred.mimeType || "image/png"};base64,${pred.bytesBase64Encoded}`;
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
      accessToken = await getVertexAccessToken(req);
    } catch (authErr) {
      const msg = authErr instanceof Error ? authErr.message : String(authErr);
      console.error("passport-stamp-art Vertex auth error:", msg);
      return json({ error: "Vertex AI authentication failed", detail: msg }, 500);
    }

    const imagenModels = ["imagen-3.0-generate-002", "imagen-3.0-fast-generate-001"];

    let imageDataUrl: string | null = null;
    let resolvedModel: string | null = null;

    for (const model of imagenModels) {
      imageDataUrl = await generateWithImagen(prompt, accessToken, model);
      if (imageDataUrl) {
        resolvedModel = model;
        break;
      }
    }

    if (!imageDataUrl) {
      console.error("passport-stamp-art: no image returned from Imagen models");
      return json({ error: "No image returned by Vertex AI" }, 502);
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
      console.error("passport-stamp-art cache upsert error", upsertError);
    }

    return json(payload);
  } catch (error) {
    console.error("passport-stamp-art error", error);
    return json({ error: String(error instanceof Error ? error.message : error) }, 500);
  }
});
