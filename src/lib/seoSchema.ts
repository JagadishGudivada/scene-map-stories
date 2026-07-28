/**
 * Shared structured-data + internal-linking helpers.
 *
 * Every absolute URL in JSON-LD must share the origin of the page's canonical,
 * otherwise Google discards the breadcrumb trail as "URL not matching".
 */

export const SITE_URL = "https://scene-map-stories.lovable.app";
export const SITE_NAME = "Sarevista";

/** Turn a path (or already-absolute URL) into an absolute canonical URL. */
export function absUrl(path: string): string {
  if (!path) return SITE_URL + "/";
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** "Rome, Italy" → "rome" — the slug shape used by /location/:slug. */
export function citySlug(label: string): string {
  return (label || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface Crumb {
  /** Visible label. */
  name: string;
  /** Site-relative path. Omit on the last (current) crumb. */
  path?: string;
}

/** BreadcrumbList JSON-LD from the same array that renders the visible trail. */
export function buildBreadcrumbSchema(crumbs: Crumb[], currentPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absUrl(c.path ?? (i === crumbs.length - 1 ? currentPath : "/")),
    })),
  };
}

export interface RelatedLink {
  name: string;
  path: string;
  description?: string;
}

/**
 * ItemList of on-page internal links (related titles, nearby cities, spots).
 * Signals hub-and-spoke topical structure and can earn sitelinks in the SERP.
 */
export function buildRelatedLinksSchema(name: string, links: RelatedLink[]) {
  if (!links.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: links.length,
    itemListElement: links.slice(0, 25).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: l.name,
      url: absUrl(l.path),
      ...(l.description ? { description: l.description } : {}),
    })),
  };
}

/** WebPage node tying the page to the site + its breadcrumb trail. */
export function buildWebPageSchema(opts: {
  name: string;
  description: string;
  path: string;
  primaryImage?: string;
}) {
  const url = absUrl(opts.path);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: opts.name,
    description: opts.description,
    ...(opts.primaryImage ? { primaryImageOfPage: opts.primaryImage } : {}),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    breadcrumb: { "@id": `${url}#breadcrumb` },
  };
}
