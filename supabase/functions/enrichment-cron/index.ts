// Daily cron orchestrator. Picks the N stalest rows from titles, locations,
// and spots and invokes the corresponding vertex enrichment function for each.
// Designed to be invoked by pg_cron via pg_net once a day with the service role
// key as Authorization header.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { db, getServiceKey } from "../_shared/store.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("enrichment-cron");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = getServiceKey();
const isLegacyKey = SERVICE_ROLE_KEY.startsWith("eyJ");

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

async function invoke(fn: string, body: Record<string, unknown>, forwardedAuthorization = "") {
  const headers: Record<string, string> = {
    apikey: SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
  };
  if (forwardedAuthorization.startsWith("Bearer ")) {
    headers.Authorization = forwardedAuthorization;
  }
  // Legacy JWT key must also be sent as Authorization Bearer for verify_jwt-enabled functions.
  // New opaque secret key is only valid on the apikey header.
  if (!headers.Authorization && isLegacyKey) {
    headers.Authorization = `Bearer ${SERVICE_ROLE_KEY}`;
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers,
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
    log.error("pickStale query failed", error, { table });
    return [];
  }
  return (data || []).map((r: any) => r.slug as string);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const rlog = log.forRequest(req, { dryRun });

  // Auth: require either the service-role key OR x-cron-secret.
  // Legacy JWT key arrives as Authorization: Bearer <key>.
  // New opaque secret key arrives on the apikey header (not Authorization).
  const authHeader = req.headers.get("Authorization") || "";
  const cronSecret = req.headers.get("x-cron-secret") || "";
  const expectedCronSecret = Deno.env.get("CRON_SECRET") || "";
  const serviceRoleOk = isLegacyKey
    ? authHeader.includes(SERVICE_ROLE_KEY)
    : req.headers.get("apikey") === SERVICE_ROLE_KEY;
  const cronSecretOk = expectedCronSecret.length > 0 && cronSecret === expectedCronSecret;
  rlog.debug("auth resolved", { serviceRoleOk, cronSecretOk });

  // Throttle: refuse to run more than once per MIN_INTERVAL_HOURS.
  const THROTTLE_KEY = "enrichment-cron:lastRun";
  const minIntervalMs = Number(Deno.env.get("ENRICHMENT_CRON_MIN_INTERVAL_HOURS") || "20") * 3600_000;
  const force = url.searchParams.get("force") === "1" && (serviceRoleOk || cronSecretOk);

  if (!force) {
    const { data: sentinel } = await db()
      .from("ai_cache")
      .select("created_at")
      .eq("function_name", "enrichment-cron")
      .eq("cache_key", THROTTLE_KEY)
      .maybeSingle();
    const lastRunAt = sentinel?.created_at ? new Date(sentinel.created_at as string).getTime() : 0;
    if (Date.now() - lastRunAt < minIntervalMs) {
      rlog.info("throttled", { lastRunAt: lastRunAt ? new Date(lastRunAt).toISOString() : null });
      rlog.end(200, { skipped: true, reason: "throttled" });
      return json({
        ok: true,
        skipped: true,
        reason: "throttled",
        lastRunAt: lastRunAt ? new Date(lastRunAt).toISOString() : null,
      });
    }
  }

  const summary = {
    startedAt: new Date().toISOString(),
    dryRun,
    titles: { picked: 0, ok: 0, failed: 0, results: [] as unknown[] },
    locations: { picked: 0, ok: 0, failed: 0, results: [] as unknown[] },
    spots: { picked: 0, ok: 0, failed: 0, results: [] as unknown[] },
  };

  rlog.info("cron run started", { batches: { titles: BATCH_TITLES, locations: BATCH_LOCATIONS, spots: BATCH_SPOTS }, staleDays: STALE_DAYS });

  const runBatch = async (
    kind: "titles" | "locations" | "spots",
    fnName: string,
    limit: number,
    bucket: { picked: number; ok: number; failed: number; results: unknown[] },
  ) => {
    const slugs = await pickStale(kind, limit);
    bucket.picked = slugs.length;
    rlog.info(`picked stale ${kind}`, { count: slugs.length });
    for (const slug of slugs) {
      const startedAt = Date.now();
      const r = await invoke(fnName, { slug, dryRun }, authHeader);
      const duration_ms = Date.now() - startedAt;
      if (r.ok) {
        bucket.ok++;
        rlog.debug(`${kind} enriched`, { slug, status: r.status, duration_ms });
      } else {
        bucket.failed++;
        rlog.warn(`${kind} enrichment failed`, { slug, status: r.status, duration_ms, body: r.body });
      }
      bucket.results.push({ slug, status: r.status });
      await sleep(PER_CALL_DELAY_MS);
    }
  };

  await runBatch("titles", "title-enrichment-vertex", BATCH_TITLES, summary.titles);
  await runBatch("locations", "location-enrichment-vertex", BATCH_LOCATIONS, summary.locations);
  await runBatch("spots", "spot-enrichment-vertex", BATCH_SPOTS, summary.spots);

  if (!dryRun) {
    const nowIso = new Date().toISOString();
    const expires = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const { error: sentinelErr } = await db().from("ai_cache").upsert(
      {
        function_name: "enrichment-cron",
        cache_key: THROTTLE_KEY,
        payload: { lastRunAt: nowIso, summary },
        created_at: nowIso,
        expires_at: expires,
      },
      { onConflict: "function_name,cache_key" }
    );
    if (sentinelErr) rlog.warn("failed to record throttle sentinel", { error: sentinelErr.message });
  }

  rlog.info("cron run finished", {
    titles: { picked: summary.titles.picked, ok: summary.titles.ok, failed: summary.titles.failed },
    locations: { picked: summary.locations.picked, ok: summary.locations.ok, failed: summary.locations.failed },
    spots: { picked: summary.spots.picked, ok: summary.spots.ok, failed: summary.spots.failed },
  });
  rlog.end(200);

  return json({
    ...summary,
    finishedAt: new Date().toISOString(),
  });
});
