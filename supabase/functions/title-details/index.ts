import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveTitleImage } from "../_shared/images.ts";
import { getTitle, upsertTitle } from "../_shared/store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sseResponse(
  run: (send: (event: string, data: unknown) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        await run(send);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send("error", { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug, title: hintTitle, year: hintYear } = await req.json();
    if (!slug || typeof slug !== "string") {
      return jsonResponse({ error: "slug required" }, 400);
    }

    // Persistent table read-through (preferred)
    const stored = await getTitle(slug);
    if (stored) {
      return jsonResponse(stored);
    }

    const cacheKey = slug;

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
    const AI_ENABLE_GOOGLE_GROUNDING = isTruthyEnv(Deno.env.get("AI_ENABLE_GOOGLE_GROUNDING"), false);
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

    const callAi = async (payload: unknown) => {
      let lastResp: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(AI_CHAT_COMPLETIONS_URL, {
            method: "POST",
            signal: AbortSignal.timeout(AI_TIMEOUT_MS),
            headers: {
              Authorization: `Bearer ${AI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          if (r.ok || r.status === 429 || r.status === 402 || r.status === 400) return r;
          lastResp = r;
        } catch (err) {
          console.error(`AI fetch attempt ${attempt + 1} failed:`, err);
        }
        await new Promise((res) => setTimeout(res, 500 * Math.pow(2, attempt)));
      }
      return lastResp ?? new Response("upstream unavailable", { status: 502 });
    };

    const generateDetails = async () => {
      let response = await callAi(AI_ENABLE_GOOGLE_GROUNDING ? withGrounding : basePayload);

      if (!response.ok && AI_ENABLE_GOOGLE_GROUNDING) {
        response = await callAi(basePayload);
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new HttpError(429, "Rate limited, please try again shortly.");
        }
        if (response.status === 402) {
          throw new HttpError(402, "AI credits exhausted.");
        }
        console.error("AI provider error:", response.status, await response.text());
        throw new HttpError(502, "AI provider error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        throw new HttpError(502, "No details returned");
      }

      return JSON.parse(toolCall.function.arguments);
    };

    return sseResponse(async (send) => {
      send("meta", {
        slug,
        title: slugTitle,
        year: slugYear,
        stage: "ai_started",
      });

      const parsed = await generateDetails();
      send("details", parsed);

      // Resolve imagery after core details so UI can render immediately.
      const { coverImage, backdropImage } = await resolveTitleImage({
        title: parsed.title,
        year: parsed.year,
        type: parsed.type,
        author: parsed.creator,
      });
      if (coverImage) parsed.coverImage = coverImage;
      if (backdropImage) parsed.backdropImage = backdropImage;

      upsertTitle(slug, parsed).catch(() => {});

      send("complete", parsed);
    });
  } catch (e) {
    console.error("title-details error:", e);
    if (e instanceof HttpError) {
      return jsonResponse({ error: e.message }, e.status);
    }
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});
