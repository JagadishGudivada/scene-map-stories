import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCached } from "../_shared/aiCache.ts";
import {
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("reveal-cards");
  buildRevealCardsScoutPrompt,
  getRevealCardsScoutSystemPrompt,
} from "../_shared/locationScout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FN = "reveal-cards";
const TTL_DAYS = 7;

type Kind = "title" | "location" | "spot";

type Card =
  | { type: "bts"; text: string }
  | { type: "didyouknow"; text: string }
  | { type: "mood"; text: string };

type Payload = { cards: Card[]; generatedAt: string };

function db() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kind, slug, name, context } = await req.json();
    if (!kind || !slug || !name) {
      return json({ error: "kind, slug, name required" }, 400);
    }

    const cacheKey = `${kind}:${slug}`;
    const cached = await getCached<Payload>(FN, cacheKey);
    if (cached?.cards?.length) return json(cached);

    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_CHAT_COMPLETIONS_URL =
      Deno.env.get("AI_CHAT_COMPLETIONS_URL") ||
      "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-2.5-flash";
    if (!AI_API_KEY) throw new Error("AI_API_KEY not configured");

    const subject = describe(kind as Kind, name, context);

    const prompt = buildRevealCardsScoutPrompt({ subject });

    const resp = await fetch(AI_CHAT_COMPLETIONS_URL, {
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
            content: getRevealCardsScoutSystemPrompt(),
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_cards",
              description: "Return a deck of short reveal cards.",
              parameters: {
                type: "object",
                properties: {
                  cards: {
                    type: "array",
                    minItems: 8,
                    maxItems: 14,
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["bts", "didyouknow", "mood"] },
                        text: { type: "string" },
                      },
                      required: ["type", "text"],
                    },
                  },
                },
                required: ["cards"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_cards" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      log.error("AI error", t, { status: resp.status });
      return json({ error: "AI request failed", status: resp.status }, 502);
    }
    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "No cards returned" }, 502);

    let parsed: { cards: Card[] };
    try {
      parsed = JSON.parse(args);
    } catch {
      return json({ error: "Bad AI payload" }, 502);
    }
    const cards = (parsed.cards || []).filter(
      (c) => c && typeof c.text === "string" && c.text.length > 0 && c.text.length <= 280
    );
    if (!cards.length) return json({ error: "Empty deck" }, 502);

    const payload: Payload = { cards, generatedAt: new Date().toISOString() };
    const expires = new Date(Date.now() + TTL_DAYS * 86400 * 1000).toISOString();
    await db()
      .from("ai_cache")
      .upsert(
        {
          function_name: FN,
          cache_key: cacheKey,
          payload,
          expires_at: expires,
        },
        { onConflict: "function_name,cache_key" }
      );

    return json(payload);
  } catch (e) {
    log.error("reveal-cards error", 500, { status: e);
    return json({ error: String(e?.message || e) } });
  }
});

function describe(kind: Kind, name: string, ctx?: Record<string, unknown>) {
  if (kind === "title")
    return `the title "${name}"${ctx?.year ? ` (${ctx.year})` : ""}${
      ctx?.type ? `, a ${ctx.type}` : ""
    } — its making, locations, casting, and on-set lore`;
  if (kind === "location")
    return `the real-world place "${name}"${
      ctx?.country ? `, ${ctx.country}` : ""
    } — its film/series moments, history, and why travellers go`;
  return `the filming spot "${name}"${
    ctx?.title ? ` (featured in "${ctx.title}")` : ""
  } — the exact scene shot here, how it was made, and what's there today`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
