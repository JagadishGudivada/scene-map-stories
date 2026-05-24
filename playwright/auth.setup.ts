import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const AUTH_STATE_PATH = path.resolve("playwright/.auth/user.json");

test("authenticate with Supabase and persist storage state", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  await mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });

  if (!email || !password) {
    await writeFile(AUTH_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }), "utf-8");
    test.skip(true, "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are required for authenticated state.");
  }

  await page.goto("/auth");
  await page.getByPlaceholder("Email address").fill(email!);
  await page.getByPlaceholder("Password").fill(password!);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 30_000 }),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);

  await expect(page).not.toHaveURL(/\/auth/);
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
