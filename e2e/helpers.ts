import { test, expect, type Page } from "@playwright/test";

/** Fails the test if the app logs a real console error (ignores known network noise). */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Third-party/network noise we don't control (tiles, images, analytics).
    if (/favicon|tile|pexels|openlibrary|nominatim|ERR_BLOCKED|net::ERR/i.test(text)) return;
    errors.push(text);
  });
  return errors;
}

/** Restores the Lovable-managed backend session so authenticated routes work. */
export async function signIn(page: Page): Promise<boolean> {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  if (!storageKey || !sessionJson) return false;

  await page.goto("/");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [storageKey, sessionJson],
  );
  return true;
}

/** Skips a spec when the seeded content it needs isn't present in this environment. */
export function skipIfMissing(condition: boolean, reason: string) {
  test.skip(condition, reason);
}

export { test, expect };
