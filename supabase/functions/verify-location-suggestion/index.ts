// Verifies a user-submitted filming location for a title using Lovable AI
// and updates the location_suggestions row with coordinates + status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { suggestionId } = await req.json();
    if (!suggestionId || typeof suggestionId !== "string") {
      return json({ error: "suggestionId required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: row, error: fetchErr } = await supabase
      .from("location_suggestions")
      .select("*")
      .eq("id", suggestionId)
      .maybeSingle();
    if (fetchErr || !row) return json({ error: "Suggestion not found" }, 404);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Today is ${today}. Using up-to-date web sources (Wikipedia, IMDb, news articles, official press, fan wikis, novel/book references), verify whether the movie / series / book "${row.title_name}" is set at, was filmed at, or notably features this real-world location: "${row.location_name}".${row.description ? ` User note: ${row.description}` : ""}

Rules:
- Accept both FILMING locations and STORY/SETTING locations (e.g. a novel set in Cornwall counts even if the book was not "filmed" there).
- Accept regional matches: if the title is set in/around a region (e.g. "Cornwall, UK") and the user submits a place inside that region, treat it as verified.
- Use grounded web search to confirm. If multiple independent sources confirm the connection, set verified=true.
- Return precise lat/lng for the canonical place (city/landmark centroid is fine).
- Only set verified=false if no credible source supports the connection.

Respond ONLY in compact JSON:
{"verified": true|false, "label": "<canonical place name, e.g. 'Cornwall, England, UK'>", "lat": <number>, "lng": <number>, "notes": "<one sentence citing the source/reasoning>"}`;

    const body: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You verify real-world filming and story locations for movies/series/books using grounded web search. Always reply with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      extra_body: {
        extra_body: {
          google: {
            tools: [{ google_search: {} }],
          },
        },
      },
    };

    let aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Fallback without grounding if gateway rejects extra_body
    if (!aiRes.ok && (aiRes.status === 400 || aiRes.status === 422)) {
      const { extra_body, ...plain } = body;
      aiRes = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(plain),
      });
    }

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      await supabase.from("location_suggestions").update({ status: "pending", ai_notes: `AI error ${aiRes.status}` }).eq("id", suggestionId);
      return json({ error: "AI provider error" }, 200);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const verified = parsed.verified === true && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) && (parsed.lat !== 0 || parsed.lng !== 0);

    await supabase.from("location_suggestions").update({
      status: verified ? "verified" : "rejected",
      verified_lat: verified ? Number(parsed.lat) : null,
      verified_lng: verified ? Number(parsed.lng) : null,
      verified_label: verified ? String(parsed.label || row.location_name) : null,
      ai_notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 500) : null,
    }).eq("id", suggestionId);

    return json({ ok: true, verified });
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
