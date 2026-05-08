import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isTruthyEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

function resolveReasoningEffort(model: string, requested: string): "none" | "minimal" | "low" | "medium" | "high" {
  const valid = new Set(["none", "minimal", "low", "medium", "high"]);
  const normalized = valid.has(requested) ? requested : "minimal";
  // Gemini 3 family does not support fully disabling thinking.
  if (model.toLowerCase().includes("gemini-3") && normalized === "none") {
    return "minimal";
  }
  return normalized as "none" | "minimal" | "low" | "medium" | "high";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ titles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_CHAT_COMPLETIONS_URL =
      Deno.env.get("AI_CHAT_COMPLETIONS_URL") ||
      "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview";
    const AI_TIMEOUT_MS = Number(Deno.env.get("AI_TIMEOUT_MS_SEARCH") || Deno.env.get("AI_TIMEOUT_MS") || "15000");
    const AI_REASONING_EFFORT = resolveReasoningEffort(
      AI_MODEL,
      (Deno.env.get("AI_REASONING_EFFORT") || "minimal").toLowerCase()
    );
    const AI_ENABLE_GOOGLE_GROUNDING = isTruthyEnv(Deno.env.get("AI_ENABLE_GOOGLE_GROUNDING"), true);
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    const basePayload = {
        model: AI_MODEL,
        reasoning_effort: AI_REASONING_EFFORT,
        messages: [
          {
            role: "system",
            content:
              `You are a movies, TV series, and books expert with web-grounded recency awareness. ` +
              `Given a query, return up to 8 real matching titles (Movie / Series / Book) ordered by relevance. ` +
              `Rules: ` +
              `1) Prioritize exact-title and same-franchise matches first. ` +
              `2) Include announced or upcoming entries when relevant, using expected release year when widely reported. ` +
              `3) For franchise queries, prefer screen entries (Movie/Series) before loosely related books unless book title is an exact match. ` +
              `4) Keep results specific to the query; avoid weakly related author bibliography. ` +
              `Respond ONLY via the return_titles tool.`,
          },
          {
            role: "user",
            content:
              `Today is ${new Date().toISOString().slice(0, 10)}. ` +
              `Search titles matching: "${query.trim()}". ` +
              `If a sequel/reboot/spinoff is announced for an upcoming year, include it.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_titles",
              description: "Return matching movie, series, or book titles",
              parameters: {
                type: "object",
                properties: {
                  titles: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        year: { type: "number" },
                        type: { type: "string", enum: ["Movie", "Series", "Book"] },
                        creator: { type: "string", description: "Director or author" },
                      },
                      required: ["title", "year", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["titles"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_titles" } },
    };

    const withGrounding = {
      ...basePayload,
      extra_body: {
        extra_body: {
          google: {
            tools: [{ google_search: {} }],
          },
        },
      },
    };

    let response = await fetch(AI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(AI_ENABLE_GOOGLE_GROUNDING ? withGrounding : basePayload),
    });

    if (!response.ok && AI_ENABLE_GOOGLE_GROUNDING) {
      // Fallback for compatibility-layer payload differences.
      response = await fetch(AI_CHAT_COMPLETIONS_URL, {
        method: "POST",
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(basePayload),
      });
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI provider error:", response.status, await response.text());
      throw new Error("AI provider error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ titles: parsed.titles || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ titles: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-titles error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
