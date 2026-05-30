import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { normalizeKey } from "../_shared/aiCache.ts";
import {
  buildSearchTitlesScoutPrompt,
  getSearchTitlesScoutSystemPrompt,
} from "../_shared/locationScout.ts";

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

type TitleOut = { title: string; year: number; type: "Movie" | "Series" | "Book"; creator?: string };

async function tmdbMultiSearch(apiKey: string, query: string): Promise<TitleOut[]> {
  try {
    const url = new URL("https://api.themoviedb.org/3/search/multi");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("language", "en-US");
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    return results
      .filter((r) => (r.media_type === "movie" || r.media_type === "tv") && !r.adult)
      .filter((r) => r.poster_path || r.backdrop_path || (r.popularity ?? 0) > 1)
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 8)
      .map((r) => {
        const date = r.release_date || r.first_air_date || "";
        const y = Number(date.slice(0, 4)) || new Date().getFullYear();
        return {
          title: String(r.title || r.name || "").trim(),
          year: y,
          type: r.media_type === "tv" ? "Series" : "Movie",
        } as TitleOut;
      })
      .filter((t) => t.title.length > 0);
  } catch (e) {
    console.error("tmdb multi-search error:", e);
    return [];
  }
}

function mergeTitles(primary: TitleOut[], secondary: TitleOut[], query: string): TitleOut[] {
  const seen = new Set<string>();
  const out: TitleOut[] = [];
  const q = query.toLowerCase().trim();
  // Boost exact-match titles to top
  const score = (t: TitleOut) => {
    const tl = t.title.toLowerCase();
    if (tl === q) return 0;
    if (tl.startsWith(q)) return 1;
    if (tl.includes(q)) return 2;
    return 3;
  };
  const all = [...primary, ...secondary].sort((a, b) => score(a) - score(b));
  for (const t of all) {
    const key = `${t.title.toLowerCase()}|${t.type}|${t.year}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
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

    const cacheKey = normalizeKey(query);
    void cacheKey;

    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_CHAT_COMPLETIONS_URL =
      Deno.env.get("AI_CHAT_COMPLETIONS_URL") ||
      "https://ai.gateway.lovable.dev/v1/chat/completions";
    // Use the cheapest/fastest model for autocomplete; grounding off by default for speed
    const AI_MODEL = Deno.env.get("AI_MODEL_SEARCH") || "google/gemini-3.1-flash-lite-preview";
    const AI_TIMEOUT_MS = Number(Deno.env.get("AI_TIMEOUT_MS_SEARCH") || "8000");
    const AI_REASONING_EFFORT = resolveReasoningEffort(
      AI_MODEL,
      (Deno.env.get("AI_REASONING_EFFORT_SEARCH") || "minimal").toLowerCase()
    );
    const AI_ENABLE_GOOGLE_GROUNDING = isTruthyEnv(Deno.env.get("AI_ENABLE_GOOGLE_GROUNDING_SEARCH"), false);
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    const basePayload = {
        model: AI_MODEL,
        reasoning_effort: AI_REASONING_EFFORT,
        messages: [
          {
            role: "system",
            content: getSearchTitlesScoutSystemPrompt(),
          },
          {
            role: "user",
            content: buildSearchTitlesScoutPrompt({
              query,
              today: new Date().toISOString().slice(0, 10),
            }),
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

    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");

    const aiFetch = async (): Promise<TitleOut[]> => {
      try {
        let response = await fetch(AI_CHAT_COMPLETIONS_URL, {
          method: "POST",
          signal: AbortSignal.timeout(AI_TIMEOUT_MS),
          headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(AI_ENABLE_GOOGLE_GROUNDING ? withGrounding : basePayload),
        });

        if (!response.ok && AI_ENABLE_GOOGLE_GROUNDING) {
          response = await fetch(AI_CHAT_COMPLETIONS_URL, {
            method: "POST",
            signal: AbortSignal.timeout(AI_TIMEOUT_MS),
            headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify(basePayload),
          });
        }

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          console.error("AI provider error:", response.status, errText);
          if (response.status >= 500 && AI_MODEL !== "google/gemini-2.5-flash-lite") {
            response = await fetch(AI_CHAT_COMPLETIONS_URL, {
              method: "POST",
              signal: AbortSignal.timeout(AI_TIMEOUT_MS),
              headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ ...basePayload, model: "google/gemini-2.5-flash-lite" }),
            });
            if (!response.ok) {
              await response.text().catch(() => "");
              return [];
            }
          } else {
            return [];
          }
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) return [];
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          return Array.isArray(parsed.titles) ? parsed.titles : [];
        } catch {
          return [];
        }
      } catch (e) {
        console.error("AI call failed:", e instanceof Error ? e.message : e);
        return [];
      }
    };

    // Run TMDB and AI in parallel; both are soft-failable so a timeout never 500s the whole request.
    const [tmdbTitles, aiTitles] = await Promise.all([
      TMDB_API_KEY ? tmdbMultiSearch(TMDB_API_KEY, query.trim()) : Promise.resolve([] as TitleOut[]),
      aiFetch(),
    ]);

    const merged = mergeTitles(tmdbTitles, aiTitles, query.trim());
    return new Response(JSON.stringify({ titles: merged }), {
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
