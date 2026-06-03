#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const fileEnv = parseEnvFile(envPath);
const env = { ...fileEnv, ...process.env };

const baseUrl = env.VITE_SUPABASE_URL;
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const includeMutating = process.argv.includes("--include-mutating");
const timeoutMs = Number(env.EDGE_CHECK_TIMEOUT_MS || 18000);

if (!baseUrl || !publishableKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.");
  console.error("Set them in .env or environment variables.");
  process.exit(1);
}

function headers(accept = "application/json") {
  return {
    "Content-Type": "application/json",
    Accept: accept,
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  };
}

function parseSseEvents(raw) {
  const events = [];
  const chunks = raw
    .split("\n\n")
    .map((c) => c.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    let eventName = "message";
    const dataParts = [];

    for (const line of lines) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
    }

    let parsed = null;
    if (dataParts.length > 0) {
      const joined = dataParts.join("\n");
      try {
        parsed = JSON.parse(joined);
      } catch {
        parsed = joined;
      }
    }

    events.push({ eventName, data: parsed });
  }

  return events;
}

function has(obj, key) {
  return (
    obj &&
    typeof obj === "object" &&
    Object.prototype.hasOwnProperty.call(obj, key)
  );
}

const checks = [
  {
    name: "search-titles",
    path: "/functions/v1/search-titles",
    body: { query: "inception" },
    validate: (json) => Array.isArray(json?.titles),
  },
  {
    name: "search-locations",
    path: "/functions/v1/search-locations",
    body: { query: "rome" },
    validate: (json) => Array.isArray(json?.locations),
  },
  {
    name: "related-titles",
    path: "/functions/v1/related-titles",
    body: { title: "Inception", year: 2010, type: "Movie" },
    validate: (json) => Array.isArray(json?.titles),
  },
  {
    name: "related-locations",
    path: "/functions/v1/related-locations",
    body: { slug: "rome", name: "Rome", country: "Italy" },
    validate: (json) => Array.isArray(json?.locations),
  },
  {
    name: "weekly-movies",
    path: "/functions/v1/weekly-movies",
    body: {},
    validate: (json) => Array.isArray(json?.movies),
  },
  {
    name: "location-photo",
    path: "/functions/v1/location-photo",
    body: { label: "Colosseum", city: "Rome", country: "Italy" },
    validate: (json) => has(json, "imageUrl") || has(json, "imageUrls"),
    allowKnownConfigError: /PEXELS API key is not configured/i,
  },
  {
    name: "title-details",
    path: "/functions/v1/title-details",
    body: {
      slug: "inception-2010",
      title: "Inception",
      year: 2010,
      type: "Movie",
      creator: "Christopher Nolan",
    },
    accept: "text/event-stream",
    mutating: true,
    validateSse: (events) => {
      const hasMeta = events.some((e) => e.eventName === "meta");
      const errorEvent = events.find((e) => e.eventName === "error");
      if (errorEvent) {
        return {
          ok: false,
          reason: errorEvent?.data?.error || "SSE error event",
        };
      }
      return { ok: hasMeta, reason: hasMeta ? "ok" : "Missing SSE meta event" };
    },
  },
  {
    name: "location-details",
    path: "/functions/v1/location-details",
    body: { slug: "rome" },
    mutating: true,
    validate: (json) => typeof json === "object" && has(json, "name") && has(json, "spots"),
  },
  {
    name: "spot-details",
    path: "/functions/v1/spot-details",
    body: {
      slug: "colosseum-rome",
      label: "Colosseum",
      titleHint: "Gladiator",
      lat: 41.8902,
      lng: 12.4922,
      type: "Movie",
    },
    mutating: true,
    validate: (json) =>
      typeof json === "object" && has(json, "name") && has(json, "lat") && has(json, "lng"),
  },
  {
    name: "reveal-cards",
    path: "/functions/v1/reveal-cards",
    body: {
      kind: "title",
      slug: "inception-2010",
      name: "Inception",
      context: { year: 2010, type: "Movie" },
    },
    mutating: true,
    validate: (json) => Array.isArray(json?.cards),
  },
];

async function runCheck(def) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${baseUrl}${def.path}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers(def.accept || "application/json"),
      body: JSON.stringify(def.body || {}),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - started;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const text = await response.text();

    if (!response.ok) {
      const isAuthRequired =
        response.status === 401 && /UNAUTHORIZED_INVALID_JWT_FORMAT|Invalid JWT/i.test(text);
      return {
        name: def.name,
        ok: isAuthRequired,
        warn: isAuthRequired,
        latencyMs,
        status: response.status,
        reason: isAuthRequired ? "auth required (verify_jwt=true)" : text.slice(0, 220),
      };
    }

    if (contentType.includes("text/event-stream") || def.accept === "text/event-stream") {
      const events = parseSseEvents(text);
      if (typeof def.validateSse === "function") {
        const result = def.validateSse(events);
        return {
          name: def.name,
          ok: result.ok,
          warn: false,
          latencyMs,
          status: response.status,
          reason: result.reason,
        };
      }
      return {
        name: def.name,
        ok: true,
        warn: false,
        latencyMs,
        status: response.status,
        reason: "SSE response",
      };
    }

    let json = null;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = null;
    }

    if (
      json &&
      def.allowKnownConfigError &&
      typeof json.error === "string" &&
      def.allowKnownConfigError.test(json.error)
    ) {
      return {
        name: def.name,
        ok: true,
        warn: false,
        latencyMs,
        status: response.status,
        reason: "known optional config missing",
      };
    }

    const valid = typeof def.validate === "function" ? def.validate(json) : true;
    return {
      name: def.name,
      ok: Boolean(valid),
      warn: false,
      latencyMs,
      status: response.status,
      reason: valid ? "ok" : `Unexpected payload: ${text.slice(0, 180)}`,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const reason =
      err?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : String(err?.message || err);
    return {
      name: def.name,
      ok: false,
      warn: false,
      latencyMs,
      status: 0,
      reason,
    };
  } finally {
    clearTimeout(timer);
  }
}

const selectedChecks = checks.filter((c) => includeMutating || !c.mutating);

console.log("Edge Function Status Check");
console.log(`Project: ${baseUrl}`);
console.log(`Timeout: ${timeoutMs}ms`);
console.log(`Include mutating checks: ${includeMutating ? "yes" : "no"}`);
console.log("");

const results = [];
for (const check of selectedChecks) {
  // eslint-disable-next-line no-await-in-loop
  const result = await runCheck(check);
  results.push(result);
  const statusLabel = result.warn ? "WARN" : result.ok ? "PASS" : "FAIL";
  console.log(
    `${statusLabel.padEnd(5)} ${result.name.padEnd(22)} ${String(result.status).padEnd(4)} ${String(result.latencyMs).padStart(5)}ms  ${result.reason}`
  );
}

const failed = results.filter((r) => !r.ok);
const warned = results.filter((r) => r.warn);
console.log("");
console.log(
  `Summary: ${results.length - failed.length}/${results.length} passed, ${warned.length} warning(s)`
);

if (failed.length > 0) {
  console.log("Failed checks:");
  for (const f of failed) {
    console.log(`- ${f.name}: ${f.reason}`);
  }
  process.exit(1);
}
