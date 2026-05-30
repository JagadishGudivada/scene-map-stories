import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { normalizeKey } from "../_shared/aiCache.ts";
import { resolveLocationImage } from "../_shared/images.ts";
import {
  buildRelatedLocationsScoutPrompt,
  getRelatedLocationsScoutSystemPrompt,
} from "../_shared/locationScout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug, name, country } = await req.json();
    if (!slug || typeof slug !== "string") {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = normalizeKey(slug);

    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_URL =
      Deno.env.get("AI_CHAT_COMPLETIONS_URL") ||
      "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-2.5-flash";
    if (!AI_API_KEY) throw new Error("AI_API_KEY not configured");

    const cityName =
      name ||
      slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    const userPrompt = buildRelatedLocationsScoutPrompt({
      cityName,
      country: typeof country === "string" ? country : undefined,
    });

    const response = await fetch(AI_URL, {
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
            content: getRelatedLocationsScoutSystemPrompt(),
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_locations",
              description: "Return related filming-location cities.",
              parameters: {
                type: "object",
                properties: {
                  locations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        country: { type: "string" },
                        countryCode: { type: "string" },
                        flag: { type: "string" },
                        count: { type: "number" },
                      },
                      required: ["name", "country", "countryCode", "flag", "count"],
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
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", response.status, await response.text());
      throw new Error("AI provider error");
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ locations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(args);
    const baseLocations = (parsed.locations || [])
      .filter((l: any) => l?.name && slugify(l.name) !== slugify(cityName))
      .slice(0, 6)
      .map((l: any) => ({ ...l, slug: slugify(l.name) }));

    // Authoritative city imagery for each related city
    const images = await Promise.all(
      baseLocations.map((l: any) =>
        resolveLocationImage({
          name: l.name,
          city: l.name,
          country: l.country,
          kind: "city",
        }).catch(() => null)
      )
    );
    const locations = baseLocations.map((l: any, i: number) => ({
      ...l,
      coverImage: images[i],
    }));

    const payload = { locations };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("related-locations error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
