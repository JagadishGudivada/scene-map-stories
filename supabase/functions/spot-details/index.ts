import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCached, setCached } from "../_shared/aiCache.ts";

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

    const cacheKey = `${slug}|${titleHint || ""}`;
    const cached = await getCached<Record<string, unknown>>("spot-details", cacheKey);
    if (cached) {
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

    const placeName =
      label ||
      slug
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const userPrompt = `Provide detailed information about the real-world filming/setting location "${placeName}"${
      titleHint ? ` featured in "${titleHint}"` : ""
    }${
      typeof lat === "number" && typeof lng === "number"
        ? ` (approx coordinates ${lat}, ${lng})`
        : ""
    }. Include the official place name, city, country, country flag emoji, precise coordinates, street address if known, a 2-3 sentence description of why this place matters, 3-4 fun facts, 3-4 visit tips, and the titles (movies/series/books) that feature it. Respond ONLY via the return_spot_details tool.`;

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
              "You are an expert on movies, TV series, books and their real-world filming/setting locations. Always return accurate, real coordinates and verified details. Never invent fictional places or addresses.",
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
      console.error("AI provider error:", response.status, await response.text());
      throw new Error("AI provider error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      // ensure type fallback
      if (!parsed.type && type) parsed.type = type;

      // Try to fetch a representative image of the place from Wikipedia
      const imageQueries = [
        parsed.name && parsed.city ? `${parsed.name} ${parsed.city}` : null,
        parsed.name,
        placeName,
      ].filter(Boolean) as string[];
      for (const q of imageQueries) {
        try {
          const sUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&origin=*`;
          const sr = await fetch(sUrl);
          const sj = await sr.json();
          const pageTitle = sj?.query?.search?.[0]?.title;
          if (!pageTitle) continue;
          const summaryRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`
          );
          const summary = await summaryRes.json();
          const img = summary?.originalimage?.source || summary?.thumbnail?.source;
          if (img) {
            parsed.image = img;
            break;
          }
        } catch (e) {
          console.error("wiki image fetch failed:", e);
        }
      }

      // Fallback: Unsplash source by place name
      if (!parsed.image) {
        const q = encodeURIComponent(`${parsed.name || placeName} ${parsed.city || ""}`.trim());
        parsed.image = `https://source.unsplash.com/1600x900/?${q}`;
      }

      setCached("spot-details", cacheKey, parsed, 60 * 60 * 24 * 30).catch(() => {});
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "No details returned" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("spot-details error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
