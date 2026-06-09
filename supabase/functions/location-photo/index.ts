import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("location-photo");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickUrl(photo: unknown): string | null {
  if (!photo || typeof photo !== "object") return null;

  const src = "src" in photo ? (photo as { src?: Record<string, unknown> }).src : undefined;
  if (!src || typeof src !== "object") return null;

  return (
    (typeof src.landscape === "string" && src.landscape) ||
    (typeof src.large2x === "string" && src.large2x) ||
    (typeof src.large === "string" && src.large) ||
    (typeof src.original === "string" && src.original) ||
    null
  );
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
    url.searchParams.set("per_page", "24");
    url.searchParams.set("orientation", "landscape");

    const pexelsRes = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!pexelsRes.ok) {
      const text = await pexelsRes.text();
      log.error("location-photo pexels error:", pexelsRes.status, text);
      throw new Error("Failed to fetch location image");
    }

    const data = await pexelsRes.json();
    const images = Array.isArray(data?.photos)
      ? data.photos.map((photo: unknown) => pickUrl(photo)).filter((url: string | null): url is string => Boolean(url))
      : [];
    const imageUrl = images[0] ?? null;

    return new Response(JSON.stringify({ imageUrl, imageUrls: images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.error("location-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", imageUrl: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
