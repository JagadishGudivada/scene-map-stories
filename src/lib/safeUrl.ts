/**
 * URL safety helpers — only http(s) links are ever rendered as hrefs.
 * Blocks javascript:, data:, vbscript: and other unsafe schemes.
 */
export function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;
  if (url.href.length > 2048) return null;
  return url.href;
}

/** Returns the URL only if it is a safe http(s) link, otherwise undefined. */
export function safeExternalUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  return normalizeWebsiteUrl(raw) ?? undefined;
}
