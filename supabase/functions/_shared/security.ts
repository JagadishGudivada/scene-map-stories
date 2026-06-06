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
