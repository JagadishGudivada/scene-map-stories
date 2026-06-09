import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildSearchLocationsScoutPrompt,
  getSearchLocationsScoutSystemPrompt,
} from "../_shared/locationScout.ts";
import { normalizeKey } from "../_shared/aiCache.ts";
import { corsHeaders, rateLimit, sanitizeQuery, badRequest } from "../_shared/security.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("search-locations");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const limited = rateLimit(req, { key: "search-locations", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }
    const trimmedQuery = sanitizeQuery((body as any)?.query, { min: 2, max: 200 });
    if (!trimmedQuery) {
      return new Response(JSON.stringify({ locations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = normalizeKey(trimmedQuery);
    void cacheKey;

    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_CHAT_COMPLETIONS_URL =
      Deno.env.get("AI_CHAT_COMPLETIONS_URL") ||
      "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = Deno.env.get("AI_MODEL_SEARCH") || "google/gemini-3.1-flash-lite-preview";
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

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
            content: getSearchLocationsScoutSystemPrompt(),
          },
          {
            role: "user",
            content: buildSearchLocationsScoutPrompt({ query: trimmedQuery }),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_locations",
              description: "Return a list of filming/setting locations",
              parameters: {
                type: "object",
                properties: {
                  locations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        lat: { type: "number" },
                        lng: { type: "number" },
                        label: { type: "string" },
                        title: { type: "string" },
                        type: { type: "string", enum: ["Movie", "Series", "Book"] },
                        image: { type: "string" },
                      },
                      required: ["lat", "lng", "label", "title", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["locations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_locations" } },
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
      const t = await response.text();
      log.error("AI provider error:", response.status, t);
      throw new Error("AI provider error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result: { locations: unknown[] } = { locations: [] };
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      result = { locations: parsed.locations || [] };
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content);
        result = { locations: parsed.locations || [] };
      } catch {
        // empty
      }
    }
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.error("search-locations error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
