// Open Library cover resolution with in-memory + localStorage caching.
// Docs: https://openlibrary.org/dev/docs/api/covers

const STORAGE_KEY = "sarevista:book-covers:v1";
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

type CacheEntry = { url: string; ts: number };

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();
let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry?.url && now - entry.ts < TTL_MS) memory.set(key, entry);
    }
  } catch {
    /* ignore corrupt cache */
  }
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(memory.entries()))
    );
  } catch {
    /* storage full or unavailable */
  }
}

export const coverByIsbn = (isbn: string) =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

export const coverById = (id: number) =>
  `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

export function getCachedCover(key: string): string | null {
  hydrate();
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    memory.delete(key);
    return null;
  }
  return entry.url;
}

export interface BookCoverRequest {
  key: string; // stable cache key (e.g. slug)
  title: string;
  author?: string;
  isbn?: string;
}

/** Resolves a cover URL, using cache first and de-duplicating concurrent lookups. */
export function resolveBookCover(book: BookCoverRequest): Promise<string> {
  const cached = getCachedCover(book.key);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(book.key);
  if (existing) return existing;

  const task = (async () => {
    let url = book.isbn ? coverByIsbn(book.isbn) : "";
    try {
      const search = new URL("https://openlibrary.org/search.json");
      search.searchParams.set("title", book.title);
      if (book.author) search.searchParams.set("author", book.author);
      search.searchParams.set("fields", "cover_i");
      search.searchParams.set("limit", "5");
      const res = await fetch(search.toString());
      const data = await res.json();
      const doc = (data?.docs || []).find((d: { cover_i?: number }) => d.cover_i);
      if (doc?.cover_i) url = coverById(doc.cover_i);
    } catch {
      /* keep ISBN fallback */
    }

    if (url) {
      memory.set(book.key, { url, ts: Date.now() });
      persist();
    }
    return url;
  })().finally(() => inflight.delete(book.key));

  inflight.set(book.key, task);
  return task;
}

/** Batch helper — returns a map of key -> cover URL. */
export async function resolveBookCovers(
  requests: BookCoverRequest[]
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    requests.map(async (r) => [r.key, await resolveBookCover(r)] as const)
  );
  return Object.fromEntries(entries.filter(([, url]) => Boolean(url)));
}
