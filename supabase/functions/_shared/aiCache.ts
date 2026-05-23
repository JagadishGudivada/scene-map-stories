import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

let _client: ReturnType<typeof createClient> | null = null;
function client() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

function stripLegacyVersionPrefix(cacheKey: string): string {
  return cacheKey.trim().replace(/^(?:v\d+:)+/i, "");
}

async function queryCache<T = unknown>(functionName: string, cacheKey: string): Promise<T | null> {
  const { data, error } = await client()
    .from("ai_cache")
    .select("payload, expires_at")
    .eq("function_name", functionName)
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return data.payload as T;
}

export async function getCached<T = unknown>(
  functionName: string,
  cacheKey: string
): Promise<T | null> {
  try {
    const normalizedKey = stripLegacyVersionPrefix(cacheKey);

    const exact = await queryCache<T>(functionName, normalizedKey);
    if (exact) return exact;

    if (normalizedKey !== cacheKey) {
      const raw = await queryCache<T>(functionName, cacheKey);
      if (raw) return raw;
    }

    const { data, error } = await client()
      .from("ai_cache")
      .select("payload, expires_at")
      .eq("function_name", functionName)
      .ilike("cache_key", `%${normalizedKey}%`)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
    return data.payload as T;
  } catch (e) {
    console.error("ai-cache get error:", e);
    return null;
  }
}

export function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
