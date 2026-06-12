import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildSpotScoutPrompt, getLocationScoutSystemPrompt } from "../_shared/locationScout.ts";
import { resolveLocationImage } from "../_shared/images.ts";
import { getSpot, upsertSpot } from "../_shared/store.ts";
import { createLogger } from "../_shared/logger.ts";
import { guardColdPath } from "../_shared/security.ts";

const log = createLogger("spot-details");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug, label, titleHint, lat, lng, type } = await req.json();
    if (!slug || typeof slug !== "string") {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stored = await getSpot(slug);
    if (stored) {
      return new Response(JSON.stringify(stored), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }

    // Cold path: validate slug + per-IP throttle BEFORE AI invocation.
    const guard = guardColdPath(req, { slug, kind: "spot" });
    if (guard) return guard;

    const cacheKey = slug;

    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_CHAT_COMPLETIONS_URL =
      Deno.env.get("AI_CHAT_COMPLETIONS_URL") ||
      "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview";
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    const placeName =
      label ||
      slug
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const userPrompt = buildSpotScoutPrompt({
      placeName,
      titleHint,
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
    });

    const response = await fetch(AI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
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
              name: "return_spot_details",
              description: "Return full details for a single filming/setting location.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  lat: { type: "number" },
                  lng: { type: "number" },
                  city: { type: "string" },
                  country: { type: "string" },
                  flag: { type: "string", description: "Country flag emoji" },
                  address: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string", enum: ["Movie", "Series", "Book"] },
                  titles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Titles featuring this location",
                  },
                  funFacts: { type: "array", items: { type: "string" } },
                  visitTips: { type: "array", items: { type: "string" } },
                },
                required: [
                  "name",
                  "lat",
                  "lng",
                  "city",
                  "country",
                  "description",
                  "type",
                  "titles",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_spot_details" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      log.error("AI provider error:", response.status, await response.text());
      throw new Error("AI provider error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      // ensure type fallback
      if (!parsed.type && type) parsed.type = type;

      // Authoritative spot image: Wikipedia strict → Wikidata-by-coords → satellite static fallback
      parsed.image = await resolveLocationImage({
        name: parsed.name || placeName,
        city: parsed.city,
        country: parsed.country,
        lat: typeof parsed.lat === "number" ? parsed.lat : (typeof lat === "number" ? lat : undefined),
        lng: typeof parsed.lng === "number" ? parsed.lng : (typeof lng === "number" ? lng : undefined),
        kind: "spot",
      });
      upsertSpot(slug, parsed).catch(() => {});
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "No details returned" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.error("spot-details error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
