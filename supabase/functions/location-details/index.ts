import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCached, setCached } from "../_shared/aiCache.ts";
import { resolveLocationImage, resolveTitleImage } from "../_shared/images.ts";
import { getLocation, upsertLocation } from "../_shared/store.ts";

const CACHE_VERSION = "v2:";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug } = await req.json();
    if (!slug || typeof slug !== "string") {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stored = await getLocation(slug);
    if (stored) {
      return new Response(JSON.stringify(stored), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    const cityName = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const userPrompt = `Provide detailed information about the city "${cityName}" as a famous filming location for movies, TV series, and books. Include city name, country, ISO country code, country flag emoji, precise coordinates, a one-line poetic tagline (e.g. "The Eternal City — cinema's most enduring backdrop"), approximate count of titles filmed there, approximate count of distinct filming spots/locations, 6-8 famous titles filmed there with year/type/genres/rating/spotsCount, 5-7 iconic real filming spots with name/lat/lng/titles, and 3-4 hidden gems with name/film/note. Also include a Location at a Glance payload with: bestTime (monthly crowd levels Jan-Dec using level 1-5, best months, overcrowded months, short note, report count), transit (3-4 practical tips, short note, walkable cluster count, walkable titles count), and crowdStatus (overall label, levelPercent 0-100, 3-5 key spots with status labels, updated text). Respond ONLY via the return_location tool.`;

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
            content:
              "You are an expert on cities as filming locations. Always return verified, real-world coordinates and titles. Never invent fake places.",
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
      console.error("AI provider error:", response.status, await response.text());
      throw new Error("AI provider error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No details returned" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Authoritative title imagery via TMDB / OpenLibrary
    if (Array.isArray(parsed.titles) && parsed.titles.length > 0) {
      const titleImages = await Promise.all(
        parsed.titles.map((t: any) =>
          resolveTitleImage({
            title: String(t?.title ?? ""),
            year: Number(t?.year) || undefined,
            type: t?.type,
          }).catch(() => ({ coverImage: null, backdropImage: null }))
        )
      );
      parsed.titles = parsed.titles.map((t: any, i: number) => ({
        ...t,
        image: titleImages[i].coverImage || titleImages[i].backdropImage || null,
      }));
    }

    // Authoritative city hero image (Wikipedia strict → Wikidata coords → satellite static)
    parsed.coverImage = await resolveLocationImage({
      name: parsed.name,
      city: parsed.name,
      country: parsed.country,
      lat: parsed.lat,
      lng: parsed.lng,
      kind: "city",
    });

    // Authoritative spot images
    if (Array.isArray(parsed.spots) && parsed.spots.length > 0) {
      const spotImages = await Promise.all(
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
      );
      parsed.spots = parsed.spots.map((s: any, i: number) => ({
        ...s,
        image: spotImages[i],
      }));
    }

    upsertLocation(slug, parsed).catch(() => {});
    setCached("location-details", cacheKey, parsed, 60 * 60 * 24 * 30).catch(() => {});
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("location-details error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
