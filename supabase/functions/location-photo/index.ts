import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const label = clean(body?.label);
    const city = clean(body?.city);
    const country = clean(body?.country);

    const queryParts = [label, city, country].filter(Boolean);
    const query = queryParts.join(" ");
    if (!query) {
      return new Response(JSON.stringify({ imageUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("VITE_PEXELS_API_KEY") || Deno.env.get("PEXELS_API_KEY");
    if (!apiKey) {
      throw new Error("PEXELS API key is not configured");
    }

    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");

    const pexelsRes = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!pexelsRes.ok) {
      const text = await pexelsRes.text();
      console.error("location-photo pexels error:", pexelsRes.status, text);
      throw new Error("Failed to fetch location image");
    }

    const data = await pexelsRes.json();
    const first = Array.isArray(data?.photos) ? data.photos[0] : null;
    const imageUrl =
      (typeof first?.src?.landscape === "string" && first.src.landscape) ||
      (typeof first?.src?.large2x === "string" && first.src.large2x) ||
      (typeof first?.src?.large === "string" && first.src.large) ||
      (typeof first?.src?.original === "string" && first.src.original) ||
      null;

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("location-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", imageUrl: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
