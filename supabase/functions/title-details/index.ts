import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildTitleScoutPrompt, getLocationScoutSystemPrompt } from "../_shared/locationScout.ts";
import { resolveTitleImage } from "../_shared/images.ts";
import { getTitle, upsertTitle } from "../_shared/store.ts";
import { createLogger } from "../_shared/logger.ts";
import { guardColdPath } from "../_shared/security.ts";
import {
  callAi,
  HttpError,
  isTruthyEnv,
  jsonResponse,
  resolveReasoningEffort,
  sseResponse,
} from "../_shared/ai.ts";

const log = createLogger("title-details");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) => jsonResponse(body, status, corsHeaders);

function normalizeTitleType(value: unknown): "Movie" | "Series" | "Book" | undefined {
  return value === "Movie" || value === "Series" || value === "Book" ? value : undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug, title: hintTitle, year: hintYear, creator: hintCreator, type: hintType, tmdb_id: hintTmdbId } = await req.json();
    if (!slug || typeof slug !== "string") {
      return json({ error: "slug required" }, 400);
    }

    // If slug carries a type suffix (`-movie|-series|-book`), it is the source of truth.
    const slugTypeMatch = slug.match(/-(movie|series|book)$/);
    const slugType = slugTypeMatch
      ? (slugTypeMatch[1] === "series" ? "Series" : slugTypeMatch[1] === "book" ? "Book" : "Movie")
      : undefined;
    const slugWithoutType = slugTypeMatch ? slug.slice(0, -slugTypeMatch[0].length) : slug;

    // Persistent table read-through (preferred)
    const stored = await getTitle(slug);
    if (stored) {
      return new Response(JSON.stringify(stored), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }

    // Cold path: validate slug shape + per-IP throttle BEFORE invoking AI,
    // so arbitrary URLs like /title/sskhsdhflsdhflkjhs can't burn credits.
    const guard = guardColdPath(req, { slug, kind: "title" });
    if (guard) return guard;

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
      slugWithoutType
        .replace(/-(\d{4})$/, "")
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    const slugYear = hintYear || Number(slugWithoutType.match(/-(\d{4})$/)?.[1] || 0) || undefined;

    // Slug type wins over hint (survives refresh/share); hint is fallback.
    const hintedType = slugType || normalizeTitleType(hintType);

    const userPrompt = buildTitleScoutPrompt({
      title: slugTitle,
      year: slugYear,
      creator: typeof hintCreator === "string" ? hintCreator : undefined,
      typeHint: hintedType,
    });

    const basePayload = {
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

    const runAi = (payload: unknown) =>
      callAi(payload, {
        url: AI_CHAT_COMPLETIONS_URL,
        apiKey: AI_API_KEY!,
        timeoutMs: AI_TIMEOUT_MS,
        logger: log,
      });

    const generateDetails = async () => {
      let response = await runAi(AI_ENABLE_GOOGLE_GROUNDING ? withGrounding : basePayload);

      if (!response.ok && AI_ENABLE_GOOGLE_GROUNDING) {
        response = await runAi(basePayload);
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new HttpError(429, "Rate limited, please try again shortly.");
        }
        if (response.status === 402) {
          throw new HttpError(402, "AI credits exhausted.");
        }
        log.error("AI provider error:", response.status, await response.text());
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

      // Resolve the hinted image in parallel with the AI call so the hero poster
      // can ship with the first `details` frame instead of waiting for `complete`.
      const hintedImagePromise = resolveTitleImage({
        title: slugTitle,
        year: slugYear,
        type: hintedType,
        author: typeof hintCreator === "string" ? hintCreator : undefined,
      });

      const parsed = await generateDetails();

      let { coverImage, backdropImage } = await hintedImagePromise;
      if (coverImage) parsed.coverImage = coverImage;
      if (backdropImage) parsed.backdropImage = backdropImage;
      send("details", parsed);

      const parsedType = normalizeTitleType(parsed.type);
      const shouldRetryImageLookup =
        (!coverImage && !backdropImage) ||
        parsed.title !== slugTitle ||
        parsed.year !== slugYear ||
        parsed.creator !== hintCreator ||
        parsedType !== hintedType;

      if (shouldRetryImageLookup) {
        // A corrected image arrives on `complete`; the frontend merges it over
        // the early hero. Keep the hinted image if the retry finds nothing.
        const resolvedImages = await resolveTitleImage({
          title: parsed.title,
          year: parsed.year,
          type: parsedType,
          author: parsed.creator,
        });
        coverImage = resolvedImages.coverImage;
        backdropImage = resolvedImages.backdropImage;
        if (coverImage) parsed.coverImage = coverImage;
        if (backdropImage) parsed.backdropImage = backdropImage;
      }

      // Persist tmdb_id and slug-derived type so future reads are unambiguous.
      if (typeof hintTmdbId === "number") parsed.tmdb_id = hintTmdbId;
      if (slugType) parsed.type = slugType;
      upsertTitle(slug, parsed).catch(() => {});

      send("complete", parsed);
    }, corsHeaders);
  } catch (e) {
    log.error("title-details error:", e);
    if (e instanceof HttpError) {
      return json({ error: e.message }, e.status);
    }
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});
