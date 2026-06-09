// Verifies a user-submitted filming/story location for a title using Lovable AI
// with REAL web-search context (DuckDuckGo + Wikipedia) so the model isn't
// limited to its training cutoff.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("verify-location-suggestion");
  buildVerifyLocationSuggestionPrompt,
  getVerifyLocationSuggestionSystemPrompt,
} from "../_shared/locationScout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

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

    // 1) Gather web evidence in parallel
    const queries = [
      `"${row.title_name}" "${row.location_name}" filming location`,
      `"${row.title_name}" "${row.location_name}" setting`,
      `"${row.title_name}" filmed at ${row.location_name}`,
    ];

    const [ddg1, ddg2, ddg3, wikiTitle, wikiLoc] = await Promise.all([
      ddgSearch(queries[0]),
      ddgSearch(queries[1]),
      ddgSearch(queries[2]),
      wikiSummary(`${row.title_name} (film)`).catch(() => wikiSummary(row.title_name)),
      wikiSummary(row.location_name),
    ]);

    const evidence = [
      ...ddg1, ...ddg2, ...ddg3,
      wikiTitle && { source: "Wikipedia", title: wikiTitle.title, snippet: wikiTitle.extract, url: wikiTitle.url },
      wikiLoc && { source: "Wikipedia", title: wikiLoc.title, snippet: wikiLoc.extract, url: wikiLoc.url },
    ].filter(Boolean).slice(0, 14);

    const evidenceBlock = evidence.length
      ? evidence.map((e: any, i) =>
          `[${i + 1}] ${e.title}\n${e.snippet}\nURL: ${e.url}`
        ).join("\n\n")
      : "(no web results returned)";

    const today = new Date().toISOString().slice(0, 10);
    const prompt = buildVerifyLocationSuggestionPrompt({
      titleName: String(row.title_name || ""),
      locationName: String(row.location_name || ""),
      description: typeof row.description === "string" ? row.description : undefined,
      today,
      evidenceBlock,
    });

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: getVerifyLocationSuggestionSystemPrompt() },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      log.error("AI error", aiRes.status, txt);
      await supabase.from("location_suggestions").update({ status: "pending", ai_notes: `AI error ${aiRes.status}` }).eq("id", suggestionId);
      return json({ error: "AI provider error" }, 200);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const verified =
      parsed.verified === true &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lng) &&
      (parsed.lat !== 0 || parsed.lng !== 0);

    await supabase.from("location_suggestions").update({
      status: verified ? "verified" : "rejected",
      verified_lat: verified ? Number(parsed.lat) : null,
      verified_lng: verified ? Number(parsed.lng) : null,
      verified_label: verified ? String(parsed.label || row.location_name) : null,
      ai_notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 500) : null,
    }).eq("id", suggestionId);

    return json({ ok: true, verified, evidenceCount: evidence.length });
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected error" }, 500);
  }
});

// --- Web search helpers ---

async function ddgSearch(query: string): Promise<Array<{ source: string; title: string; snippet: string; url: string }>> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `q=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: Array<{ source: string; title: string; snippet: string; url: string }> = [];
    // Match result blocks
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(html)) !== null && count < 5) {
      const url = decodeDdgUrl(m[1]);
      const title = stripHtml(m[2]);
      const snippet = stripHtml(m[3]);
      if (title && snippet) {
        results.push({ source: "DuckDuckGo", title, snippet, url });
        count++;
      }
    }
    return results;
  } catch (e) {
    log.warn("ddg failed", { detail: e });
    return [];
  }
}

function decodeDdgUrl(href: string): string {
  // DDG wraps: //duckduckgo.com/l/?uddg=<encoded>&rut=...
  try {
    const u = new URL(href.startsWith("//") ? `https:${href}` : href);
    const real = u.searchParams.get("uddg");
    return real ? decodeURIComponent(real) : href;
  } catch {
    return href;
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

async function wikiSummary(term: string): Promise<{ title: string; extract: string; url: string } | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/\s+/g, "_"))}`,
      { headers: { "User-Agent": UA, Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const j = await res.json();
    if (!j.extract) return null;
    return {
      title: j.title,
      extract: String(j.extract).slice(0, 600),
      url: j.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(term)}`,
    };
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
