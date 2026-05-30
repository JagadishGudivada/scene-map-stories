export type ScoutMediaType = "Movie" | "Series" | "Book";

export type TitleScoutSeed = {
  title: string;
  year?: number;
  creator?: string;
  typeHint?: ScoutMediaType;
};

export type SpotScoutSeed = {
  placeName: string;
  titleHint?: string;
  lat?: number;
  lng?: number;
};

export type LocationScoutSeed = {
  cityName: string;
};

export type SearchLocationsScoutSeed = {
  query: string;
};

export type VerifyLocationSuggestionScoutSeed = {
  titleName: string;
  locationName: string;
  description?: string;
  today: string;
  evidenceBlock: string;
};

export type RelatedLocationsScoutSeed = {
  cityName: string;
  country?: string;
};

export type SearchTitlesScoutSeed = {
  query: string;
  today: string;
};

export type RevealCardsScoutSeed = {
  subject: string;
};

export function getLocationScoutSystemPrompt() {
  return [
    "You are a senior location scout for movies, TV series, and books.",
    "Your job is to identify real-world filming locations and story settings with high factual confidence.",
    "Always prefer verifiable, real coordinates and recognized place names.",
    "Never invent fictional places, addresses, or coordinates.",
    "Use the metadata provided by the caller as strong grounding context when identifying the correct work.",
  ].join(" ");
}

export function buildTitleScoutPrompt(seed: TitleScoutSeed) {
  const details: string[] = [`Title: \"${seed.title}\"`];
  if (seed.year) details.push(`Release year: ${seed.year}`);
  if (seed.creator) details.push(`Creator/director/author hint: ${seed.creator}`);
  if (seed.typeHint) details.push(`Likely media type: ${seed.typeHint}`);

  return [
    "Use the following known metadata to identify the correct work before returning locations:",
    details.join(". "),
    "Return type (Movie / Series / Book), release year, IMDb-style rating, genres, a one-paragraph synopsis, and a comprehensive list of minimum 10 real filming locations for Movies/Series or real-world settings for Books.",
    "Every location must include a real place label and real-world coordinates.",
    "Respond ONLY via the return_title_details tool.",
  ].join(" ");
}

export function buildSpotScoutPrompt(seed: SpotScoutSeed) {
  const details: string[] = [`Real-world place: \"${seed.placeName}\"`];
  if (seed.titleHint) details.push(`Featured title hint: \"${seed.titleHint}\"`);
  if (typeof seed.lat === "number" && typeof seed.lng === "number") {
    details.push(`Approx coordinates hint: ${seed.lat}, ${seed.lng}`);
  }

  return [
    "Use the following metadata to identify the exact location:",
    details.join(". "),
    "Include official place name, city, country, country flag emoji, precise coordinates, street address if known, a 2-3 sentence description, 3-4 fun facts, 3-4 visit tips, and titles that feature this location.",
    "Respond ONLY via the return_spot_details tool.",
  ].join(" ");
}

export function buildLocationScoutPrompt(seed: LocationScoutSeed) {
  return [
    `Provide detailed information about the city \"${seed.cityName}\" as a famous filming location for movies, TV series, and books.`,
    "Include city name, country, ISO country code, country flag emoji, precise coordinates, a one-line poetic tagline, 6-8 famous titles with year/type/genres/rating/spotsCount, and 3-4 hidden gems with name/film/note.",
    "CRITICAL — filming spots: Return as many real, verifiable filming spots as possible in the spots array with name/lat/lng/titles.",
    "Aim for 15-25 spots for major filming hubs and at least 8-12 for other notable cities.",
    "Each spot must be a real, distinct on-screen location with accurate coordinates. Do not invent.",
    "The totalLocations field MUST equal spots.length and totalTitles must equal titles.length.",
    "Also include bestTime (monthly crowd levels Jan-Dec, best months, overcrowded months, short note, report count), transit (3-4 practical tips, short note, walkable cluster count, walkable titles count), and crowdStatus (overall label, levelPercent 0-100, key spots with status, updated text).",
    "Respond ONLY via the return_location tool.",
  ].join(" ");
}

export function getSearchLocationsScoutSystemPrompt() {
  return [
    getLocationScoutSystemPrompt(),
    "When given a search query, return famous filming and story-setting locations.",
    "Return up to 8 locations and use real coordinates.",
    "Type must be exactly Movie, Series, or Book.",
  ].join(" ");
}

export function buildSearchLocationsScoutPrompt(seed: SearchLocationsScoutSeed) {
  return `Find filming or story-setting locations for: \"${seed.query.trim()}\"`;
}

export function getVerifyLocationSuggestionSystemPrompt() {
  return [
    getLocationScoutSystemPrompt(),
    "You verify real-world filming and story locations for movies, series, and books.",
    "Treat provided web evidence as primary truth when deciding verification.",
    "Always reply with valid compact JSON only.",
  ].join(" ");
}

export function buildVerifyLocationSuggestionPrompt(seed: VerifyLocationSuggestionScoutSeed) {
  return `Today is ${seed.today}.\n\nYou must verify whether the movie / series / book \"${seed.titleName}\" is set at, was filmed at, or notably features this real-world location: \"${seed.locationName}\".${seed.description ? `\nUser note: ${seed.description}` : ""}\n\nBelow is fresh web evidence (DuckDuckGo + Wikipedia, fetched just now). Treat it as your primary source of truth - it may contain information newer than your training cutoff.\n\n=== WEB EVIDENCE ===\n${seed.evidenceBlock}\n=== END EVIDENCE ===\n\nRules:\n- Accept BOTH filming locations and story/setting locations.\n- Accept regional matches: a place inside a region the title is set in counts.\n- If the web evidence above credibly supports the connection, set verified=true.\n- If evidence is thin but plausible and consistent (for example multiple snippets mention both the title and location together), prefer verified=true.\n- Only set verified=false if the evidence clearly contradicts or is completely silent on the connection.\n- Return precise lat/lng for the canonical place. Use your geographic knowledge for coordinates; they do not need to be in the snippets.\n\nRespond ONLY in compact JSON:\n{\"verified\": true|false, \"label\": \"<canonical place name>\", \"lat\": <number>, \"lng\": <number>, \"notes\": \"<one sentence citing which evidence snippet [n] supports this>\"}`;
}

export function getRelatedLocationsScoutSystemPrompt() {
  return [
    getLocationScoutSystemPrompt(),
    "Return only real cities with correct country and flag metadata.",
    "Never include the source city in results.",
  ].join(" ");
}

export function buildRelatedLocationsScoutPrompt(seed: RelatedLocationsScoutSeed) {
  return `Suggest 6 cities (excluding \"${seed.cityName}\") most similar to \"${seed.cityName}\"${seed.country ? `, ${seed.country}` : ""} as famous real-world filming hubs. Return name, country, ISO 2-letter country code, flag emoji, and approximate filmed-title count. Respond ONLY via the return_locations tool.`;
}

export function getSearchTitlesScoutSystemPrompt() {
  return [
    "You are a senior title scout for movies, TV series, and books with web-grounded recency awareness.",
    "Return up to 8 real matching titles ordered by relevance.",
    "Prioritize exact-title and same-franchise matches.",
    "Include upcoming announced entries when clearly relevant.",
    "Keep results specific to the query.",
    "Respond ONLY via the return_titles tool.",
  ].join(" ");
}

export function buildSearchTitlesScoutPrompt(seed: SearchTitlesScoutSeed) {
  return `Today is ${seed.today}. Search titles matching: \"${seed.query.trim()}\". Include clearly relevant announced sequel/reboot/spinoff entries when available.`;
}

export function getRevealCardsScoutSystemPrompt() {
  return [
    "You are a film-obsessed travel friend with deep knowledge of movies, series, books, and filming locations.",
    "Write short, scroll-friendly, witty lines with factual grounding.",
    "Never invent quotes or unverifiable facts.",
  ].join(" ");
}

export function buildRevealCardsScoutPrompt(seed: RevealCardsScoutSeed) {
  return `Generate 12 short reveal cards about ${seed.subject}. Mix card types: bts, didyouknow, mood. Rules: each card 12-32 words and <=220 chars, no hashtags, no emoji at start, no \"fun fact:\" prefix, factual only. Return strictly via the return_cards tool.`;
}