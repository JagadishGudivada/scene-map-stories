// Dynamic, sharded sitemap for Sarevista.
// Routes:
//   /functions/v1/sitemap                 -> sitemap index
//   /functions/v1/sitemap?type=static     -> static pages shard
//   /functions/v1/sitemap?type=titles&page=1
//   /functions/v1/sitemap?type=locations&page=1
//   /functions/v1/sitemap?type=spots&page=1
//
// Designed to be reverse-proxied from /sitemap.xml etc. via public/_redirects
// so crawlers see canonical site URLs. CDN-cacheable for 24h.

import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("sitemap");

const SITE = "https://sarevista.com";
const SHARD_SIZE = 10_000;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const STATIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
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

type Kind = "titles" | "locations" | "spots";
const KIND_TO_TABLE: Record<Kind, { table: string; prefix: string }> = {
  titles: { table: "titles", prefix: "/title/" },
  locations: { table: "locations", prefix: "/location/" },
  spots: { table: "spots", prefix: "/spot/" },
};

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!)
  );
}

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string) {
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

function urlsetXml(urls: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

async function countRows(table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function buildIndex() {
  const [tCount, lCount, sCount] = await Promise.all([
    countRows("titles"),
    countRows("locations"),
    countRows("spots"),
  ]);

  const shards: string[] = [`${SITE}/sitemap-static.xml`];
  const addShards = (kind: Kind, n: number) => {
    const pages = Math.max(1, Math.ceil(n / SHARD_SIZE));
    for (let i = 1; i <= pages; i++) {
      shards.push(`${SITE}/sitemap-${kind}-${i}.xml`);
    }
  };
  addShards("titles", tCount);
  addShards("locations", lCount);
  addShards("spots", sCount);

  const today = new Date().toISOString().slice(0, 10);
  const body = shards
    .map(
      (loc) =>
        `  <sitemap><loc>${loc}</loc><lastmod>${today}</lastmod></sitemap>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

async function buildStatic() {
  const urls = STATIC_ROUTES.map((r) =>
    urlEntry(`${SITE}${r.path}`, undefined, r.changefreq, r.priority)
  );
  return urlsetXml(urls);
}

async function buildShard(kind: Kind, page: number) {
  const { table, prefix } = KIND_TO_TABLE[kind];
  const from = (page - 1) * SHARD_SIZE;
  const to = from + SHARD_SIZE - 1;

  const { data, error } = await supabase
    .from(table)
    .select("slug, updated_at")
    .order("slug", { ascending: true })
    .range(from, to);
  if (error) throw error;

  const urls = (data ?? []).map((row: { slug: string; updated_at: string }) =>
    urlEntry(
      `${SITE}${prefix}${row.slug}`,
      row.updated_at ? row.updated_at.slice(0, 10) : undefined,
      "weekly",
      "0.7"
    )
  );
  return urlsetXml(urls);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);

    let xml: string;
    if (!type) xml = await buildIndex();
    else if (type === "static") xml = await buildStatic();
    else if (type === "titles" || type === "locations" || type === "spots") {
      xml = await buildShard(type, page);
    } else {
      return new Response("Unknown sitemap type", { status: 404 });
    }

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // Browser/proxy: 1h. Cloudflare/CDN: 24h. Stale-while-revalidate: 7d.
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    log.error("sitemap error", e);
    return new Response("sitemap generation failed", { status: 500 });
  }
});
