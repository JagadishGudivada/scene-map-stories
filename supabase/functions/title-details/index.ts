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

async function fetchWikipediaImage(
  title: string,
  year?: number,
  type?: string
): Promise<string | null> {
  const queries = [
    year ? `${title} ${year} ${type === "Book" ? "novel" : type === "Series" ? "TV series" : "film"}` : null,
    `${title} ${type === "Book" ? "novel" : type === "Series" ? "TV series" : "film"}`,
    title,
  ].filter(Boolean) as string[];

  for (const q of queries) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
        q
      )}&srlimit=1&origin=*`;
      const sr = await fetch(searchUrl);
      const sj = await sr.json();
      const pageTitle = sj?.query?.search?.[0]?.title;
      if (!pageTitle) continue;

      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        pageTitle.replace(/ /g, "_")
      )}`;
      const summaryRes = await fetch(summaryUrl);
      const summary = await summaryRes.json();
      const img =
        summary?.originalimage?.source ||
        summary?.thumbnail?.source ||
        null;
      if (img) return img;
    } catch (e) {
      console.error("wiki image fetch failed:", e);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug, title: hintTitle, year: hintYear } = await req.json();
    if (!slug || typeof slug !== "string") {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_CHAT_COMPLETIONS_URL =
      Deno.env.get("AI_CHAT_COMPLETIONS_URL") ||
      "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview";
    const AI_TIMEOUT_MS = Number(Deno.env.get("AI_TIMEOUT_MS_TITLE_DETAILS") || Deno.env.get("AI_TIMEOUT_MS") || "20000");
    const AI_REASONING_EFFORT = resolveReasoningEffort(
      AI_MODEL,
      (Deno.env.get("AI_REASONING_EFFORT") || "minimal").toLowerCase()
    );
    const AI_ENABLE_GOOGLE_GROUNDING = isTruthyEnv(Deno.env.get("AI_ENABLE_GOOGLE_GROUNDING"), true);
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    // Reconstruct a human title from slug if no hint provided
    const slugTitle =
      hintTitle ||
      slug
        .replace(/-(\d{4})$/, "")
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    const slugYear = hintYear || Number(slug.match(/-(\d{4})$/)?.[1] || 0) || undefined;

    const userPrompt = `Provide detailed information about the title "${slugTitle}"${
      slugYear ? ` (${slugYear})` : ""
    }. Include type (Movie / Series / Book), release year, IMDb-style rating, genres, a one-paragraph synopsis, and a comprehensive list of real filming locations (for Movies/Series) or real-world settings mentioned in the story (for Books). Use real-world coordinates. Respond ONLY via the return_title_details tool.`;

    const basePayload = {
        model: AI_MODEL,
        reasoning_effort: AI_REASONING_EFFORT,
        messages: [
          {
            role: "system",
            content:
              "You are an expert on movies, TV series, and books and their real-world filming/setting locations. Always return accurate, real coordinates. Never invent fictional places.",
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_title_details",
              description: "Return full title details with filming/setting locations.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  year: { type: "number" },
                  type: { type: "string", enum: ["Movie", "Series", "Book"] },
                  rating: { type: "number", description: "0-10 rating" },
                  synopsis: { type: "string" },
                  creator: { type: "string", description: "Director or author" },
                  genres: { type: "array", items: { type: "string" } },
                  locations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Place name, e.g. 'Park Hyatt, Tokyo'" },
                        lat: { type: "number" },
                        lng: { type: "number" },
                        description: {
                          type: "string",
                          description: "Why this place matters in the title",
                        },
                      },
                      required: ["label", "lat", "lng"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "year", "type", "rating", "synopsis", "genres", "locations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_title_details" } },
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
      console.error("AI provider error:", response.status, await response.text());
      throw new Error("AI provider error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);

      // Fetch a hero image from Wikipedia based on title
      const coverImage = await fetchWikipediaImage(parsed.title, parsed.year, parsed.type);
      if (coverImage) parsed.coverImage = coverImage;

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "No details returned" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("title-details error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
