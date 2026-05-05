import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWikipediaImage(query: string): Promise<string | null> {
  try {
    const sUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&origin=*`;
    const sr = await fetch(sUrl);
    const sj = await sr.json();
    const pageTitle = sj?.query?.search?.[0]?.title;
    if (!pageTitle) return null;
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`
    );
    const summary = await summaryRes.json();
    return summary?.originalimage?.source || summary?.thumbnail?.source || null;
  } catch (e) {
    console.error("wiki image error:", e);
    return null;
  }
}

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const cityName = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const userPrompt = `Provide detailed information about the city "${cityName}" as a famous filming location for movies, TV series, and books. Include city name, country, ISO country code, country flag emoji, precise coordinates, a one-line poetic tagline (e.g. "The Eternal City — cinema's most enduring backdrop"), approximate count of titles filmed there, approximate count of distinct filming spots/locations, 6-8 famous titles filmed there with year/type/genres/rating/spotsCount, 5-7 iconic real filming spots with name/lat/lng/titles, and 3-4 hidden gems with name/film/note. Respond ONLY via the return_location tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
      console.error("AI gateway error:", response.status, await response.text());
      throw new Error("AI gateway error");
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

    // Fetch hero image from Wikipedia
    const img =
      (await fetchWikipediaImage(`${parsed.name} ${parsed.country} cityscape`)) ||
      (await fetchWikipediaImage(parsed.name));
    parsed.coverImage =
      img || `https://source.unsplash.com/1600x900/?${encodeURIComponent(parsed.name + " skyline")}`;

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
