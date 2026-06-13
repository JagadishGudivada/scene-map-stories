// Generates public/sitemap.xml at build/dev start.
// Fetches dynamic slugs (titles, locations, spots) via the public REST API
// using the anon key — public tables only, no service role required.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/sitemap.xml");

const BASE_URL = process.env.SITEMAP_BASE_URL || "https://sarevista.com";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://gsdtkzjiaydkearsngxy.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHRremppYXlka2VhcnNuZ3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDc5ODAsImV4cCI6MjA5MDIyMzk4MH0.WB93in9xQkAzct8wXcX2HyrZQC5dPX4d0Q_GDQLaKEc";

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/map", changefreq: "weekly", priority: "0.9" },
  { path: "/explore", changefreq: "weekly", priority: "0.8" },
  { path: "/guides", changefreq: "weekly", priority: "0.7" },
  { path: "/destinations", changefreq: "weekly", priority: "0.7" },
  { path: "/add", changefreq: "monthly", priority: "0.5" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/our-story", changefreq: "monthly", priority: "0.5" },
  { path: "/community", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/careers", changefreq: "monthly", priority: "0.4" },
  { path: "/press", changefreq: "monthly", priority: "0.4" },
  { path: "/help", changefreq: "monthly", priority: "0.5" },
  { path: "/safety", changefreq: "monthly", priority: "0.4" },
  { path: "/accessibility", changefreq: "monthly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/affiliate-disclosure", changefreq: "yearly", priority: "0.3" },
];

const xmlEscape = (s) =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );

function urlEntry(loc, lastmod, changefreq, priority) {
  return [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchAll(table, prefix) {
  const out = [];
  const PAGE = 1000;
  for (let from = 0; from < 50_000; from += PAGE) {
    const to = from + PAGE - 1;
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=slug,updated_at&order=slug.asc`;
    const res = await fetch(url, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        Range: `${from}-${to}`,
        "Range-Unit": "items",
        Prefer: "count=none",
      },
    });
    if (!res.ok) {
      console.warn(`[sitemap] ${table} fetch ${from}-${to} → ${res.status}`);
      break;
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) {
      if (!r?.slug) continue;
      out.push({
        loc: `${BASE_URL}${prefix}${r.slug}`,
        lastmod: r.updated_at ? String(r.updated_at).slice(0, 10) : undefined,
      });
    }
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function generateSitemap() {
  const staticUrls = STATIC_ROUTES.map((r) =>
    urlEntry(`${BASE_URL}${r.path}`, undefined, r.changefreq, r.priority)
  );

  let dynamicUrls = [];
  try {
    const [titles, locations, spots] = await Promise.all([
      fetchAll("titles", "/title/"),
      fetchAll("locations", "/location/"),
      fetchAll("spots", "/spot/"),
    ]);
    dynamicUrls = [...titles, ...locations, ...spots].map((r) =>
      urlEntry(r.loc, r.lastmod, "weekly", "0.7")
    );
  } catch (e) {
    console.warn("[sitemap] dynamic fetch failed, writing static-only:", e?.message || e);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...dynamicUrls].join("\n")}
</urlset>`;

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, xml);
  console.log(
    `[sitemap] wrote ${OUT} (${STATIC_ROUTES.length} static + ${dynamicUrls.length} dynamic)`
  );
}

// Allow direct invocation: `node scripts/generate-sitemap.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
