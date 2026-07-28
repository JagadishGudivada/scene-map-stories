/**
 * Search-intent driven SEO copy for titles (movies, series, books).
 *
 * Modelled on real Semrush demand for filming-location queries, which is
 * overwhelmingly title-first:
 *   - "[title] filming locations"          (highest volume pattern)
 *   - "where was [title] filmed"
 *   - "where does [title] take place"      (setting intent / books)
 *   - "movies filmed in [city]"            (city modifier, long tail)
 */

export type SeoMediaType = "Movie" | "Series" | "Book" | string;

export interface TitleSeoInput {
  title: string;
  year?: number | string;
  type?: SeoMediaType;
  synopsis?: string;
  creator?: string;
  locations?: Array<{ label?: string } | string>;
}

const clamp = (s: string, n: number) => {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= n) return clean;
  return `${clean.slice(0, n - 1).replace(/[\s,.;:—-]+$/, "")}…`;
};

const labelOf = (loc: { label?: string } | string): string =>
  typeof loc === "string" ? loc : loc?.label || "";

/** "Paris, France" → "Paris". Keeps the searchable place token. */
const shortPlace = (label: string) => label.split(",")[0]?.trim() || label.trim();

/** Unique, human-readable place names for the description / FAQ answers. */
export function topPlaces(locations: TitleSeoInput["locations"], max = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const loc of locations || []) {
    const name = shortPlace(labelOf(loc));
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
}

export function joinPlaces(places: string[]): string {
  if (places.length === 0) return "";
  if (places.length === 1) return places[0];
  return `${places.slice(0, -1).join(", ")} and ${places[places.length - 1]}`;
}

const isBook = (t?: SeoMediaType) => t === "Book";
const typeNoun = (t?: SeoMediaType) =>
  t === "Series" ? "TV series" : isBook(t) ? "book" : "movie";

/**
 * Title tag: leads with the exact head term users type, then the qualifier.
 * e.g. "Sherlock filming locations — where was the TV series filmed? | Sarevista"
 */
export function buildTitleSeoTitle({ title, year, type }: TitleSeoInput): string {
  const y = year ? ` (${year})` : "";
  if (isBook(type)) {
    return clamp(`${title} locations${y} — where the book is set, mapped`, 62);
  }
  return clamp(
    `${title} filming locations${y} — where was the ${typeNoun(type)} filmed?`,
    62
  );
}

/**
 * Meta description: answers the query in the first clause, names real places
 * (the differentiator vs. generic "filming locations" listicles), then the map CTA.
 */
export function buildTitleSeoDescription(input: TitleSeoInput): string {
  const { title, year, type, synopsis, locations } = input;
  const y = year ? ` (${year})` : "";
  const places = topPlaces(locations, 3);
  const count = (locations || []).length;
  const verb = isBook(type) ? "set" : "filmed";

  const lead = places.length
    ? `${title}${y} was ${verb} in ${joinPlaces(places)}.`
    : `Where was ${title}${y} ${verb}?`;
  const scale = count ? ` All ${count} real locations mapped stop-by-stop` : ` Every real location mapped`;
  const tail = ` with travel tips, photos and directions.${synopsis ? ` ${synopsis}` : ""}`;

  return clamp(`${lead}${scale}${tail}`, 158);
}

/** Keyword variants worth surfacing on-page (H2s, FAQ) — no stuffing in meta. */
export function buildTitleKeywords({ title, type, locations }: TitleSeoInput): string[] {
  const noun = typeNoun(type);
  const places = topPlaces(locations, 2);
  return [
    `${title} filming locations`,
    isBook(type) ? `where is ${title} set` : `where was ${title} filmed`,
    `${title} locations map`,
    `where does ${title} take place`,
    ...places.map((p) => `${noun}s filmed in ${p}`),
  ];
}

/**
 * FAQPage JSON-LD mirroring the question phrasings people actually search.
 * Google surfaces these under the title page for "where was X filmed" queries.
 */
export function buildTitleFaqSchema(input: TitleSeoInput) {
  const { title, year, type, locations, creator } = input;
  const y = year ? ` (${year})` : "";
  const verb = isBook(type) ? "set" : "filmed";
  const places = topPlaces(locations, 5);
  const count = (locations || []).length;
  if (!count) return null;

  const answerPlaces = places.length ? joinPlaces(places) : "several real-world locations";

  const qa: Array<[string, string]> = [
    [
      isBook(type) ? `Where is ${title} set?` : `Where was ${title} filmed?`,
      `${title}${y} was ${verb} in ${answerPlaces}. Sarevista maps all ${count} confirmed locations with directions and visiting tips.`,
    ],
    [
      `Where does ${title} take place?`,
      `${title} takes place across ${answerPlaces}. Each on-screen place is pinned on the Sarevista map so you can plan a route between them.`,
    ],
    [
      `Can you visit the ${title} ${verb === "set" ? "settings" : "filming locations"}?`,
      `Yes — ${count} ${title} locations are publicly visitable or viewable from nearby. Open the map to see access notes for each stop.`,
    ],
  ];

  if (creator) {
    qa.push([
      `Who made ${title}?`,
      `${title}${y} was created by ${creator}.`,
    ]);
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}
