// Daily cron orchestrator. Picks the N stalest rows from titles, locations,
// and spots and invokes the corresponding vertex enrichment function for each.
// Designed to be invoked by pg_cron via pg_net once a day with the service role
// key as Authorization header.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { db } from "../_shared/store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_TITLES = Number(Deno.env.get("ENRICHMENT_CRON_BATCH_TITLES") || "10");
const BATCH_LOCATIONS = Number(Deno.env.get("ENRICHMENT_CRON_BATCH_LOCATIONS") || "10");
const BATCH_SPOTS = Number(Deno.env.get("ENRICHMENT_CRON_BATCH_SPOTS") || "20");
const STALE_DAYS = Number(Deno.env.get("ENRICHMENT_CRON_STALE_DAYS") || "30");
const PER_CALL_DELAY_MS = Number(Deno.env.get("ENRICHMENT_CRON_DELAY_MS") || "1500");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function invoke(fn: string, body: Record<string, unknown>, authHeader: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* keep text */ }
  return { ok: res.ok, status: res.status, body: parsed };
}

async function pickStale(table: "titles" | "locations" | "spots", limit: number) {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  const { data, error } = await db()
    .from(table)
    .select("slug, last_fetched_at")
    .lt("last_fetched_at", cutoff)
    .order("last_fetched_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error(`enrichment-cron pickStale ${table} error`, error);
    return [];
  }
  return (data || []).map((r: any) => r.slug as string);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Minimal auth: must include service role key as Authorization bearer
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.includes(SERVICE_ROLE_KEY)) {
    return json({ error: "Forbidden" }, 403);
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const summary = {
    startedAt: new Date().toISOString(),
    dryRun,
    titles: { picked: 0, ok: 0, failed: 0, results: [] as unknown[] },
    locations: { picked: 0, ok: 0, failed: 0, results: [] as unknown[] },
    spots: { picked: 0, ok: 0, failed: 0, results: [] as unknown[] },
  };

  const titles = await pickStale("titles", BATCH_TITLES);
  summary.titles.picked = titles.length;
  for (const slug of titles) {
    const r = await invoke("title-enrichment-vertex", { slug, dryRun }, authHeader);
    if (r.ok) summary.titles.ok++; else summary.titles.failed++;
    summary.titles.results.push({ slug, status: r.status });
    await sleep(PER_CALL_DELAY_MS);
  }

  const locations = await pickStale("locations", BATCH_LOCATIONS);
  summary.locations.picked = locations.length;
  for (const slug of locations) {
    const r = await invoke("location-enrichment-vertex", { slug, dryRun }, authHeader);
    if (r.ok) summary.locations.ok++; else summary.locations.failed++;
    summary.locations.results.push({ slug, status: r.status });
    await sleep(PER_CALL_DELAY_MS);
  }

  const spots = await pickStale("spots", BATCH_SPOTS);
  summary.spots.picked = spots.length;
  for (const slug of spots) {
    const r = await invoke("spot-enrichment-vertex", { slug, dryRun }, authHeader);
    if (r.ok) summary.spots.ok++; else summary.spots.failed++;
    summary.spots.results.push({ slug, status: r.status });
    await sleep(PER_CALL_DELAY_MS);
  }

  return json({
    ...summary,
    finishedAt: new Date().toISOString(),
  });
});
