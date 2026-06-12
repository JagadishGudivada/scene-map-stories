// Shared security helpers for edge functions:
// - in-memory per-IP rate limiter (best-effort, per-isolate)
// - input validation primitives (no external deps)
//
// NOTE: This is a defense-in-depth layer. The primary rate-limit and bot
// filtering should be enforced at Cloudflare (WAF + Rate Limiting rules).

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Sliding fixed-window limiter. Returns null if allowed, or a 429 Response if throttled.
 * Per-isolate only — best effort. Use as a backstop, not the primary limiter.
 */
export function rateLimit(
  req: Request,
  opts: { key: string; limit: number; windowMs: number }
): Response | null {
  const ip = clientIp(req);
  const k = `${opts.key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.resetAt < now) {
    buckets.set(k, { count: 1, resetAt: now + opts.windowMs });
    // opportunistic GC
    if (buckets.size > 5000) {
      for (const [key, v] of buckets) if (v.resetAt < now) buckets.delete(key);
    }
    return null;
  }
  b.count += 1;
  if (b.count > opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }
  return null;
}

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/**
 * Normalize and bound a free-text query string.
 * Returns null if invalid (caller should 400).
 */
export function sanitizeQuery(
  raw: unknown,
  opts: { min?: number; max?: number } = {}
): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(CONTROL_CHARS, "").trim();
  const min = opts.min ?? 1;
  const max = opts.max ?? 200;
  if (cleaned.length < min || cleaned.length > max) return null;
  return cleaned;
}

export function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonError(message: string, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

// =========================================================================
// Slug validation — rejects obvious garbage so AI is never invoked for
// arbitrary URLs like /title/sskhsdhflsdhflkjhs. Cached slugs still hit DB
// first; this only gates the cold (AI) path.
// =========================================================================

const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VOWELS = /[aeiouy]/;
const FOUR_CONSONANTS = /[bcdfghjklmnpqrstvwxz]{5,}/i;

export type SlugKind = "title" | "location" | "spot";

/**
 * Returns true if the slug looks like a plausible human-readable identifier.
 * Heuristics:
 *  - kebab-case shape, 2..80 chars
 *  - every dash-separated token is 1..24 chars
 *  - at least one vowel overall
 *  - no token contains 5+ consecutive consonants (catches keyboard mash)
 *  - title slugs allow an optional trailing -YYYY year suffix
 */
export function isPlausibleSlug(raw: unknown, kind: SlugKind): raw is string {
  if (typeof raw !== "string") return false;
  const s = raw.trim().toLowerCase();
  if (s.length < 2 || s.length > 80) return false;
  if (!SLUG_SHAPE.test(s)) return false;
  const tokens = s.split("-");
  if (tokens.some((t) => t.length === 0 || t.length > 24)) return false;
  // Strip trailing year for title slugs before linguistic checks.
  let stem = s;
  if (kind === "title") {
    stem = s.replace(/-(\d{4})$/, "");
    if (!stem) return false;
  }
  const letters = stem.replace(/[^a-z]/g, "");
  if (letters.length < 2) return false;
  if (!VOWELS.test(letters)) return false;
  for (const t of stem.split("-")) {
    const lettersOnly = t.replace(/[^a-z]/g, "");
    if (!lettersOnly) continue;
    if (!VOWELS.test(lettersOnly) && lettersOnly.length >= 4) return false;
    if (FOUR_CONSONANTS.test(lettersOnly)) return false;
  }
  return true;
}

/**
 * Cold-path guard. Call AFTER a DB/cache miss but BEFORE the AI invocation.
 * - Rejects malformed/garbage slugs with 400
 * - Per-IP rate-limits cold misses to prevent enumeration-driven AI spend
 *
 * Returns null if allowed; otherwise a Response to return immediately.
 */
export function guardColdPath(
  req: Request,
  opts: { slug: string; kind: SlugKind; limit?: number; windowMs?: number }
): Response | null {
  if (!isPlausibleSlug(opts.slug, opts.kind)) {
    return jsonError("Not found", 404);
  }
  return rateLimit(req, {
    key: `cold:${opts.kind}`,
    limit: opts.limit ?? 8,
    windowMs: opts.windowMs ?? 60 * 60 * 1000,
  });
}

