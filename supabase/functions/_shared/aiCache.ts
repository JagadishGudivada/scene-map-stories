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

export async function getCached<T = unknown>(
  functionName: string,
  cacheKey: string
): Promise<T | null> {
  try {
    const { data, error } = await client()
      .from("ai_cache")
      .select("payload, expires_at")
      .eq("function_name", functionName)
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
    return data.payload as T;
  } catch (e) {
    console.error("ai-cache get error:", e);
    return null;
  }
}

export async function setCached(
  functionName: string,
  cacheKey: string,
  payload: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await client()
      .from("ai_cache")
      .upsert(
        {
          function_name: functionName,
          cache_key: cacheKey,
          payload: payload as never,
          expires_at: expiresAt,
        },
        { onConflict: "function_name,cache_key" }
      );
  } catch (e) {
    console.error("ai-cache set error:", e);
  }
}

export function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
