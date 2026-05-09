import { supabase } from "@/integrations/supabase/client";

type Entry = { value: unknown; expiresAt: number };

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

function storageKey(fn: string, key: string) {
  return `ai-cache:${fn}:${key}`;
}

function readPersistent(fn: string, key: string): Entry | null {
  try {
    const raw =
      sessionStorage.getItem(storageKey(fn, key)) ||
      localStorage.getItem(storageKey(fn, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistent(fn: string, key: string, entry: Entry, persist: "session" | "local") {
  try {
    const data = JSON.stringify(entry);
    if (persist === "local") {
      localStorage.setItem(storageKey(fn, key), data);
    } else {
      sessionStorage.setItem(storageKey(fn, key), data);
    }
  } catch {
    // quota or unavailable — ignore
  }
}

export type InvokeOptions = {
  /** Cache TTL in seconds. Default 7 days. */
  ttlSeconds?: number;
  /** Persistence strategy. 'local' survives refresh, 'session' is per-tab. Default 'local'. */
  persist?: "session" | "local" | "memory";
};

export async function invokeCached<T = any>(
  functionName: string,
  body: Record<string, unknown>,
  cacheKey: string,
  opts: InvokeOptions = {}
): Promise<T> {
  const { ttlSeconds = 60 * 60 * 24 * 7, persist = "local" } = opts;
  const memKey = `${functionName}:${cacheKey}`;

  // 1. memory
  const m = memory.get(memKey);
  if (m && m.expiresAt > Date.now()) return m.value as T;

  // 2. session/local
  if (persist !== "memory") {
    const p = readPersistent(functionName, cacheKey);
    if (p) {
      memory.set(memKey, p);
      return p.value as T;
    }
  }

  // 3. dedupe in-flight
  const existing = inflight.get(memKey);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    const entry: Entry = { value: data, expiresAt: Date.now() + ttlSeconds * 1000 };
    memory.set(memKey, entry);
    if (persist !== "memory") writePersistent(functionName, cacheKey, entry, persist);
    return data as T;
  })();

  inflight.set(memKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(memKey);
  }
}

/** Fire-and-forget prefetch. Safe to call repeatedly. */
export function prefetch(
  functionName: string,
  body: Record<string, unknown>,
  cacheKey: string,
  opts: InvokeOptions = {}
) {
  invokeCached(functionName, body, cacheKey, opts).catch(() => {});
}
