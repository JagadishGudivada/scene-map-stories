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

    const prompt = `Verify whether the movie/series/book "${row.title_name}" was filmed at or features this real-world location: "${row.location_name}".${row.description ? ` User note: ${row.description}` : ""}

Respond ONLY in compact JSON:
{"verified": true|false, "label": "<canonical place name, e.g. 'Durdle Door, Dorset, UK'>", "lat": <number>, "lng": <number>, "notes": "<one sentence reasoning>"}

If you cannot confirm with reasonable confidence, set verified=false and lat/lng to 0.`;

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You verify real-world filming locations for movies/series/books. Use your knowledge to confirm and return precise coordinates. Always reply with valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

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
