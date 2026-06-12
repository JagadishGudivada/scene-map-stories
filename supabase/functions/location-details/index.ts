import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCached } from "../_shared/aiCache.ts";
import { resolveLocationImage, resolveTitleImage } from "../_shared/images.ts";
import { buildLocationScoutPrompt, getLocationScoutSystemPrompt } from "../_shared/locationScout.ts";
import { getLocation, upsertLocation } from "../_shared/store.ts";
import { createLogger } from "../_shared/logger.ts";
import { guardColdPath } from "../_shared/security.ts";
import {
  callAi,
  HttpError,
  jsonResponse,
  resolveReasoningEffort,
  sseResponse,
} from "../_shared/ai.ts";

const log = createLogger("location-details");

const CACHE_VERSION = "v3:";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) => jsonResponse(body, status, corsHeaders);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug } = await req.json();
    if (!slug || typeof slug !== "string") {
      return json({ error: "slug required" }, 400);
    }

    // Stream the cold path (AI text first, images after) when the client asks for
    // it; cache/DB hits below always return plain JSON, which the frontend handles.
    const wantsStream =
      new URL(req.url).searchParams.get("stream") === "1" ||
      (req.headers.get("accept") || "").includes("text/event-stream");

    const stored = await getLocation(slug);
    if (stored) {
      return new Response(JSON.stringify(stored), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }

    const cacheKey = CACHE_VERSION + slug;
    const cached = await getCached<Record<string, unknown>>("location-details", cacheKey);
    if (cached) {
      upsertLocation(slug, cached as Record<string, any>).catch(() => {});
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_CHAT_COMPLETIONS_URL =
      Deno.env.get("AI_CHAT_COMPLETIONS_URL") ||
      "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview";
    const AI_TIMEOUT_MS = Number(
      Deno.env.get("AI_TIMEOUT_MS_LOCATION_DETAILS") || Deno.env.get("AI_TIMEOUT_MS") || "30000"
    );
    const AI_REASONING_EFFORT = resolveReasoningEffort(
      AI_MODEL,
      (Deno.env.get("AI_REASONING_EFFORT") || "minimal").toLowerCase()
    );
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    const cityName = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const userPrompt = buildLocationScoutPrompt({ cityName });

    const runAi = (aiPayload: unknown) =>
      callAi(aiPayload, {
        url: AI_CHAT_COMPLETIONS_URL,
        apiKey: AI_API_KEY!,
        timeoutMs: AI_TIMEOUT_MS,
        logger: log,
      });

    const payload = {
        model: AI_MODEL,
        reasoning_effort: AI_REASONING_EFFORT,
        messages: [
          {
            role: "system",
            content: getLocationScoutSystemPrompt(),
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_location",
              description: "Return rich city filming-location info.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  country: { type: "string" },
                  countryCode: { type: "string" },
                  flag: { type: "string" },
                  lat: { type: "number" },
                  lng: { type: "number" },
                  tagline: { type: "string" },
                  totalTitles: { type: "number" },
                  totalLocations: { type: "number" },
                  titles: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        year: { type: "number" },
                        type: { type: "string", enum: ["Movie", "Series", "Book"] },
                        spots: { type: "number" },
                        genres: { type: "array", items: { type: "string" } },
                        rating: { type: "number" },
                      },
                      required: ["title", "year", "type", "spots", "genres", "rating"],
                      additionalProperties: false,
                    },
                  },
                  spots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        slug: { type: "string" },
                        lat: { type: "number" },
                        lng: { type: "number" },
                        titles: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "slug", "lat", "lng", "titles"],
                      additionalProperties: false,
                    },
                  },
                  hiddenGems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        film: { type: "string" },
                        note: { type: "string" },
                      },
                      required: ["name", "film", "note"],
                      additionalProperties: false,
                    },
                  },
                  bestTime: {
                    type: "object",
                    properties: {
                      monthLevels: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            month: { type: "string" },
                            level: { type: "number" },
                          },
                          required: ["month", "level"],
                          additionalProperties: false,
                        },
                      },
                      overcrowdedMonths: { type: "array", items: { type: "string" } },
                      bestMonths: { type: "array", items: { type: "string" } },
                      note: { type: "string" },
                      reportCount: { type: "number" },
                    },
                    required: ["monthLevels", "overcrowdedMonths", "bestMonths", "note", "reportCount"],
                    additionalProperties: false,
                  },
                  transit: {
                    type: "object",
                    properties: {
                      tips: { type: "array", items: { type: "string" } },
                      note: { type: "string" },
                      walkableClusters: { type: "number" },
                      walkableTitles: { type: "number" },
                    },
                    required: ["tips", "note", "walkableClusters", "walkableTitles"],
                    additionalProperties: false,
                  },
                  crowdStatus: {
                    type: "object",
                    properties: {
                      overall: { type: "string" },
                      levelPercent: { type: "number" },
                      spots: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            status: { type: "string" },
                          },
                          required: ["name", "status"],
                          additionalProperties: false,
                        },
                      },
                      updatedText: { type: "string" },
                    },
                    required: ["overall", "levelPercent", "spots", "updatedText"],
                    additionalProperties: false,
                  },
                },
                required: [
                  "name",
                  "country",
                  "countryCode",
                  "flag",
                  "lat",
                  "lng",
                  "tagline",
                  "totalTitles",
                  "totalLocations",
                  "titles",
                  "spots",
                  "hiddenGems",
                  "bestTime",
                  "transit",
                  "crowdStatus",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_location" } },
    };

    // Cold-path work: call the model, ship the text immediately via `onStage`,
    // then backfill all imagery concurrently. Returns the fully enriched object.
    const enrich = async (
      onStage?: (event: string, data: unknown) => void,
    ): Promise<Record<string, any>> => {
      const response = await runAi(payload);
      if (!response.ok) {
        if (response.status === 429) throw new HttpError(429, "Rate limited, please try again shortly.");
        if (response.status === 402) throw new HttpError(402, "AI credits exhausted.");
        log.error("AI provider error", undefined, {
          status: response.status,
          body: await response.text(),
        });
        throw new HttpError(502, "AI provider error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        throw new HttpError(502, "No details returned");
      }

      const parsed = JSON.parse(toolCall.function.arguments) as Record<string, any>;

      // Enforce consistency before first paint: counts must match the arrays we return.
      if (Array.isArray(parsed.spots)) parsed.totalLocations = parsed.spots.length;
      if (Array.isArray(parsed.titles)) parsed.totalTitles = parsed.titles.length;

      // Ship AI text/coords/titles/spots now; images backfill below.
      onStage?.("details", parsed);

      // Resolve all imagery concurrently (titles via TMDB/OpenLibrary, city hero,
      // spots) — the slowest block now bounds the wait instead of the sum.
      const titlesPromise: Promise<void> =
        Array.isArray(parsed.titles) && parsed.titles.length > 0
          ? Promise.all(
              parsed.titles.map((t: any) =>
                resolveTitleImage({
                  title: String(t?.title ?? ""),
                  year: Number(t?.year) || undefined,
                  type: t?.type,
                }).catch(() => ({ coverImage: null, backdropImage: null }))
              )
            ).then((images) => {
              parsed.titles = parsed.titles.map((t: any, i: number) => ({
                ...t,
                image: images[i].coverImage || images[i].backdropImage || null,
              }));
            })
          : Promise.resolve();

      const cityPromise: Promise<void> = resolveLocationImage({
        name: parsed.name,
        city: parsed.name,
        country: parsed.country,
        lat: parsed.lat,
        lng: parsed.lng,
        kind: "city",
      })
        .then((img) => {
          parsed.coverImage = img;
        })
        .catch(() => {});

      const spotsPromise: Promise<void> =
        Array.isArray(parsed.spots) && parsed.spots.length > 0
          ? Promise.all(
              parsed.spots.map((s: any) =>
                resolveLocationImage({
                  name: s?.name,
                  city: parsed.name,
                  country: parsed.country,
                  lat: s?.lat,
                  lng: s?.lng,
                  kind: "spot",
                }).catch(() => null)
              )
            ).then((images) => {
              parsed.spots = parsed.spots.map((s: any, i: number) => ({
                ...s,
                image: images[i],
              }));
            })
          : Promise.resolve();

      await Promise.all([titlesPromise, cityPromise, spotsPromise]);

      upsertLocation(slug, parsed).catch(() => {});
      return parsed;
    };

    if (wantsStream) {
      return sseResponse(async (send) => {
        send("meta", { slug, name: cityName });
        const parsed = await enrich(send);
        send("complete", parsed);
      }, corsHeaders);
    }

    const parsed = await enrich();
    return json(parsed);
  } catch (e) {
    log.error("location-details error", e);
    if (e instanceof HttpError) {
      return json({ error: e.message }, e.status);
    }
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});