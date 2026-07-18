import { describe, expect, it } from "vitest";
import {
  buildTrailById,
  buildTrails,
  normalizeCityKey,
  type LinkedSpot,
  type RawTitleLocation,
} from "@/lib/trails";
import type { TrailHub } from "@/lib/trailHubs";

function raw(
  titleId: string,
  label: string,
  lat: number | null,
  lng: number | null,
  city: string | null = null,
  country: string | null = null,
): RawTitleLocation {
  return { titleId, titleSlug: titleId, titleName: titleId, label, lat, lng, city, country };
}

function spot(
  titleId: string,
  slug: string,
  name: string,
  lat: number | null,
  lng: number | null,
  city: string | null,
  imageUrl: string | null = null,
  country: string | null = null,
): LinkedSpot {
  return { titleId, slug, name, lat, lng, city, country, imageUrl };
}

const LONDON_HUB: TrailHub = { key: "london", name: "London", lat: 51.5074, lng: -0.1278 };
const READING_HUB: TrailHub = { key: "reading", name: "Reading", lat: 51.4543, lng: -0.9781 };
const HUB_OPTS = { hubs: [LONDON_HUB, READING_HUB], dayTripRadiusKm: 120, maxTrails: 10 };
const NO_HUB_OPTS = { hubs: [] as TrailHub[], maxTrails: 10 };

// Three compact central-London stops (~250 m legs → walking).
const compactLondon = [
  raw("t1", "Stop A", 51.5, -0.12, "London", "United Kingdom"),
  raw("t1", "Stop B", 51.502, -0.121, "London", "United Kingdom"),
  raw("t2", "Stop C", 51.504, -0.122, "London", "United Kingdom"),
];

describe("normalizeCityKey", () => {
  it("strips comma suffixes, case, and extra whitespace", () => {
    expect(normalizeCityKey("  London, UK ")).toBe("london");
    expect(normalizeCityKey("New   York")).toBe("new york");
    expect(normalizeCityKey("PARIS, Île-de-France, France")).toBe("paris");
  });

  it("folds diacritics and punctuation", () => {
    expect(normalizeCityKey("São Paulo")).toBe("sao paulo");
    expect(normalizeCityKey("St. Albans")).toBe("st albans");
  });
});

describe("spot resolution", () => {
  it("prefers linked-spot slug, name, coords, and image over raw JSON fields", () => {
    const rawLocs = [
      raw("t1", "Abbey Road Studios", 51.53, -0.18, "London"),
      ...compactLondon,
    ];
    const spots = [
      spot("t1", "abbey-road-studios", "Abbey Road Studios", 51.532, -0.177, "London", "img.jpg"),
    ];
    const [trail] = buildTrails(rawLocs, spots, NO_HUB_OPTS);
    const resolved = trail.stops.find((s) => s.slug === "abbey-road-studios");
    expect(resolved).toBeDefined();
    expect(resolved?.lat).toBe(51.532);
    expect(resolved?.image).toBe("img.jpg");
    expect(trail.heroImage).toBe("img.jpg");
  });

  it("does not use a spot linked to a different title", () => {
    const rawLocs = [
      raw("t9", "Abbey Road Studios", 51.53, -0.18, "London"),
      ...compactLondon,
    ];
    const spots = [
      spot("t1", "abbey-road-studios", "Abbey Road Studios", 51.532, -0.177, "London", "img.jpg"),
    ];
    const [trail] = buildTrails(rawLocs, spots, NO_HUB_OPTS);
    const unresolved = trail.stops.find((s) => s.name === "Abbey Road Studios");
    expect(unresolved?.slug).toBeNull();
    expect(unresolved?.lat).toBe(51.53);
  });

  it("drops entries with no usable coordinates", () => {
    const rawLocs = [raw("t1", "Nowhere", null, null, "London"), ...compactLondon];
    const [trail] = buildTrails(rawLocs, [], NO_HUB_OPTS);
    expect(trail.stops).toHaveLength(3);
    expect(trail.stops.map((s) => s.name)).not.toContain("Nowhere");
  });
});

describe("geo-sanity filter", () => {
  it("drops stops labelled with a city but far from the group's median point", () => {
    const rawLocs = [
      ...compactLondon,
      raw("t3", "Mislabelled", 54.5, -0.12, "London", "United Kingdom"),
    ];
    const [trail] = buildTrails(rawLocs, [], NO_HUB_OPTS);
    expect(trail.stops).toHaveLength(3);
    expect(trail.stops.map((s) => s.name)).not.toContain("Mislabelled");
  });
});

describe("dedup", () => {
  it("merges stops resolving to the same spot slug and unions their titles", () => {
    const rawLocs = [
      raw("t1", "Big Ben", 51.5007, -0.1246, "London"),
      raw("t2", "Big Ben", 51.5007, -0.1246, "London"),
      raw("t1", "Stop B", 51.502, -0.121, "London"),
      raw("t2", "Stop C", 51.504, -0.122, "London"),
    ];
    const spots = [
      spot("t1", "big-ben", "Big Ben", 51.5007, -0.1246, "London"),
      spot("t2", "big-ben", "Big Ben", 51.5007, -0.1246, "London"),
    ];
    const [trail] = buildTrails(rawLocs, spots, NO_HUB_OPTS);
    expect(trail.stops).toHaveLength(3);
    expect(trail.titleCount).toBe(2);
  });

  it("merges same-named unresolved stops within 2.5 km but keeps them when apart", () => {
    const rawLocs = [
      raw("t1", "The Pub", 51.5, -0.12, "London"),
      raw("t2", "The Pub", 51.5005, -0.12, "London"), // ~55 m away → merged
      raw("t1", "The Pub", 51.53, -0.12, "London"), // ~3.3 km away → separate
      raw("t2", "Stop B", 51.502, -0.121, "London"),
    ];
    const [trail] = buildTrails(rawLocs, [], NO_HUB_OPTS);
    expect(trail.stops.filter((s) => s.name === "The Pub")).toHaveLength(2);
  });

  it("merges any stops within 200 m regardless of name and unions their titles", () => {
    const rawLocs = [
      raw("t1", "Acton Lane Power Station", 51.5304, -0.26, "London"),
      raw("t2", "Acton Power Station (Interior)", 51.5301, -0.2597, "London"), // ~40 m away
      raw("t1", "Stop B", 51.535, -0.255, "London"),
      raw("t2", "Stop C", 51.537, -0.252, "London"),
    ];
    const [trail] = buildTrails(rawLocs, [], NO_HUB_OPTS);
    expect(trail.stops).toHaveLength(3);
    const merged = trail.stops.find((s) => s.name === "Acton Lane Power Station");
    expect(merged).toBeDefined(); // shortest label wins among unresolved variants
    expect(merged?.titles.map((t) => t.slug)).toEqual(["t1", "t2"]);
  });

  it("merges variants whose extra locality tokens defeat substring containment", () => {
    const rawLocs = [
      raw("t1", "Warner Bros. Studios Leavesden, Watford, England", 51.6906, -0.4213, "London"),
      raw("t2", "Warner Bros. Studios Leavesden, England", 51.693, -0.418, "London"), // ~350 m away
      raw("t1", "Stop B", 51.699, -0.41, "London"),
      raw("t2", "Stop C", 51.703, -0.405, "London"),
    ];
    const [trail] = buildTrails(rawLocs, [], NO_HUB_OPTS);
    const leavesden = trail.stops.filter((s) => s.name.includes("Leavesden"));
    expect(leavesden).toHaveLength(1);
    expect(leavesden[0].name).toBe("Warner Bros. Studios Leavesden, England"); // shortest label
    expect(leavesden[0].titles.map((t) => t.slug)).toEqual(["t1", "t2"]);
  });

  it("merges name variants within 2.5 km and keeps the resolved spot identity", () => {
    const rawLocs = [
      raw("t1", "Pinewood Studios, London", 51.549, -0.535),
      raw("t2", "Pinewood Studios, Iver Heath, UK", 51.5499, -0.5353),
      raw("t3", "Pinewood Studios", 51.548, -0.534),
      raw("t1", "Windsor Castle", 51.4839, -0.6044, "Windsor"),
      raw("t2", "Oxford Divinity School", 51.752, -1.2577, "Oxford"),
    ];
    const spots = [
      spot(
        "t2",
        "pinewood-studios",
        "Pinewood Studios",
        51.5499,
        -0.5353,
        "Iver Heath",
        "pinewood.jpg",
        "United Kingdom",
      ),
    ];
    const trails = buildTrails(rawLocs, spots, HUB_OPTS);
    const dayTrip = trails.find((t) => t.id === "day-trip-london");
    const pinewoods = dayTrip?.stops.filter((s) => s.name.toLowerCase().includes("pinewood")) ?? [];
    expect(pinewoods).toHaveLength(1);
    expect(pinewoods[0].slug).toBe("pinewood-studios");
    expect(pinewoods[0].image).toBe("pinewood.jpg");
    expect(pinewoods[0].titles.map((t) => t.slug).sort()).toEqual(["t1", "t2", "t3"]);
  });
});

describe("generic place filter", () => {
  const venueA = raw("t1", "Acton Lane Power Station, London, UK", 51.5304, -0.26, "London");
  const venueB = raw("t2", "Battersea Power Station, London", 51.4816, -0.1445, "London");
  const venueC = raw("t3", "Borough Market, London", 51.5055, -0.091, "London");

  it("drops locality-only stops but keeps venues with locality suffixes", () => {
    const generic = raw("t4", "London, England", 51.507, -0.128, "London", "United Kingdom");
    const trails = buildTrails([venueA, venueB, venueC, generic], [], NO_HUB_OPTS);
    expect(trails).toHaveLength(1);
    expect(trails[0].stops.map((s) => s.name)).not.toContain("London, England");
    expect(trails[0].stops).toHaveLength(3);
    expect(trails[0].stops.map((s) => s.name)).toContain("Acton Lane Power Station, London, UK");
  });

  it("a generic stop cannot help a trail meet its threshold", () => {
    const generic = raw("t4", "London, England", 51.507, -0.128, "London", "United Kingdom");
    expect(buildTrails([venueA, venueB, generic], [], NO_HUB_OPTS)).toHaveLength(0);
  });
});

describe("per-stop title tags", () => {
  it("carries distinct source titles on each stop, sorted by name", () => {
    const rawLocs = [
      { ...raw("beta", "Big Ben", 51.5007, -0.1246, "London"), titleName: "Beta", titleSlug: "beta-2020" },
      { ...raw("alpha", "Big Ben", 51.5007, -0.1246, "London"), titleName: "Alpha", titleSlug: "alpha-2019" },
      raw("t1", "Stop B", 51.502, -0.121, "London"),
      raw("t2", "Stop C", 51.504, -0.122, "London"),
    ];
    const [trail] = buildTrails(rawLocs, [], NO_HUB_OPTS);
    const bigBen = trail.stops.find((s) => s.name === "Big Ben");
    expect(bigBen?.titles).toEqual([
      { slug: "alpha-2019", name: "Alpha" },
      { slug: "beta-2020", name: "Beta" },
    ]);
    expect(trail.stops.find((s) => s.name === "Stop B")?.titles).toEqual([
      { slug: "t1", name: "t1" },
    ]);
  });
});

describe("city tours", () => {
  it("requires at least 3 distinct stops", () => {
    expect(buildTrails(compactLondon.slice(0, 2), [], NO_HUB_OPTS)).toHaveLength(0);
    const trails = buildTrails(compactLondon, [], NO_HUB_OPTS);
    expect(trails).toHaveLength(1);
    expect(trails[0].id).toBe("city-tour-london");
    expect(trails[0].name).toBe("London City Tour");
    expect(trails[0].country).toBe("United Kingdom");
  });

  it("classifies compact tours as walking and spread ones as drive", () => {
    const [walking] = buildTrails(compactLondon, [], NO_HUB_OPTS);
    expect(walking.kind).toBe("walking");

    const spread = [
      raw("t1", "A", 51.5, -0.12, "London"),
      raw("t1", "B", 51.55, -0.12, "London"),
      raw("t2", "C", 51.6, -0.12, "London"),
    ];
    const [drive] = buildTrails(spread, [], NO_HUB_OPTS);
    expect(drive.kind).toBe("drive");
  });
});

describe("day trips", () => {
  const windsor = raw("t3", "Windsor Castle", 51.4839, -0.6044, "Windsor", "United Kingdom");
  const oxford = raw("t4", "Oxford Divinity School", 51.752, -1.2577, "Oxford", "United Kingdom");

  it("builds a hub day trip from satellites within the radius", () => {
    const trails = buildTrails([...compactLondon, windsor, oxford], [], HUB_OPTS);
    const dayTrip = trails.find((t) => t.id === "day-trip-london");
    expect(dayTrip).toBeDefined();
    expect(dayTrip?.name).toBe("Day Trip from London");
    expect(dayTrip?.kind).toBe("drive");
    expect(dayTrip?.stops.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Windsor Castle", "Oxford Divinity School"]),
    );
  });

  it("excludes satellites beyond the radius", () => {
    const manchester = raw("t5", "Castlefield", 53.4808, -2.2426, "Manchester");
    const trails = buildTrails([...compactLondon, windsor, oxford, manchester], [], HUB_OPTS);
    const dayTrip = trails.find((t) => t.id === "day-trip-london");
    expect(dayTrip?.stops.map((s) => s.name)).not.toContain("Castlefield");
  });

  it("excludes cities that are themselves hubs, and needs 2+ satellites", () => {
    const readingStop = raw("t5", "Reading Gaol", 51.4562, -0.9689, "Reading");
    // Only satellite candidates are Windsor (valid) and Reading (a hub → excluded) → below threshold.
    const trails = buildTrails([...compactLondon, windsor, readingStop], [], HUB_OPTS);
    expect(trails.find((t) => t.id === "day-trip-london")).toBeUndefined();
  });

  it("counts city-less stops beyond the core radius as satellites", () => {
    const cityless = raw("t5", "Mystery Manor", 51.7, -0.3, null); // ~25 km out
    const trails = buildTrails([...compactLondon, windsor, cityless], [], HUB_OPTS);
    const dayTrip = trails.find((t) => t.id === "day-trip-london");
    expect(dayTrip?.stops.map((s) => s.name)).toContain("Mystery Manor");
  });
});

describe("hub core/satellite split", () => {
  const windsor = raw("t3", "Windsor Castle", 51.4839, -0.6044, "Windsor", "United Kingdom");
  const oxford = raw("t4", "Oxford Divinity School", 51.752, -1.2577, "Oxford", "United Kingdom");

  it("builds a hub city tour from core stops regardless of city labels", () => {
    const citylessCentral = raw("t5", "Mystery Central", 51.51, -0.13, null);
    const trails = buildTrails([...compactLondon, citylessCentral], [], HUB_OPTS);
    const tour = trails.find((t) => t.id === "city-tour-london");
    expect(tour).toBeDefined();
    expect(tour?.name).toBe("London City Tour");
    expect(tour?.stops.map((s) => s.name)).toContain("Mystery Central");
  });

  it("emits no day trip when every stop is inside the core radius", () => {
    const central = [
      raw("t5", "Central A", 51.51, -0.13, null),
      raw("t6", "Central B", 51.495, -0.11, null),
    ];
    const trails = buildTrails([...compactLondon, ...central], [], HUB_OPTS);
    expect(trails.find((t) => t.id === "day-trip-london")).toBeUndefined();
    expect(trails.find((t) => t.id === "city-tour-london")).toBeDefined();
  });

  it("emits a single city-tour id per hub key (hub version wins over the named-city group)", () => {
    const trails = buildTrails(compactLondon, [], HUB_OPTS);
    const tours = trails.filter((t) => t.id === "city-tour-london");
    expect(tours).toHaveLength(1);
    expect(tours[0].name).toBe("London City Tour");
  });

  it("keeps all satellites on a day trip and caps hub anchors at five", () => {
    const core = Array.from({ length: 8 }, (_, i) =>
      raw(`c${i}`, `Core ${i}`, 51.5 + i * 0.002, -0.12, "London"),
    );
    const trails = buildTrails([...core, windsor, oxford], [], HUB_OPTS);
    const dayTrip = trails.find((t) => t.id === "day-trip-london");
    expect(dayTrip?.stops).toHaveLength(7); // 5 anchors + 2 satellites
    expect(dayTrip?.stops.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Windsor Castle", "Oxford Divinity School"]),
    );
  });

  it("prefers resolved stops over unresolved near-ties when capping", () => {
    // 0.003° lat spacing (~330 m) keeps neighbours outside the unconditional merge distance.
    const unresolved = Array.from({ length: 16 }, (_, i) =>
      raw("t1", `S${i}`, 51.5 + i * 0.003, -0.12, "London"),
    );
    const resolvedRaw = raw("t1", "Abbey Road Studios", 51.5225, -0.121, "London");
    const spots = [
      spot("t1", "abbey-road-studios", "Abbey Road Studios", 51.5225, -0.121, "London", "img.jpg"),
    ];
    const [tour] = buildTrails([...unresolved, resolvedRaw], spots, NO_HUB_OPTS);
    expect(tour.stops).toHaveLength(15);
    expect(tour.stops.some((s) => s.slug === "abbey-road-studios")).toBe(true);
  });
});

describe("ranking and ids", () => {
  const parisStops = [
    raw("p1", "A", 48.8606, 2.3376, "Paris", "France"),
    raw("p1", "B", 48.8529, 2.3499, "Paris", "France"),
    raw("p1", "C", 48.8867, 2.3431, "Paris", "France"),
  ];

  it("ranks by distinct title count first", () => {
    const trails = buildTrails([...compactLondon, ...parisStops], [], NO_HUB_OPTS);
    expect(trails.map((t) => t.id)).toEqual(["city-tour-london", "city-tour-paris"]);
    expect(buildTrails([...compactLondon, ...parisStops], [], { ...NO_HUB_OPTS, maxTrails: 1 })).toHaveLength(1);
  });

  it("resolves recipe ids consistently with the ranked list", () => {
    const rawLocs = [...compactLondon, ...parisStops];
    const fromList = buildTrails(rawLocs, [], NO_HUB_OPTS).find((t) => t.id === "city-tour-paris");
    const byId = buildTrailById("city-tour-paris", rawLocs, [], NO_HUB_OPTS);
    expect(byId).toEqual(fromList);
  });

  it("returns null for unknown or below-threshold ids", () => {
    expect(buildTrailById("city-tour-atlantis", compactLondon, [], NO_HUB_OPTS)).toBeNull();
    expect(buildTrailById("city-tour-london", compactLondon.slice(0, 2), [], NO_HUB_OPTS)).toBeNull();
  });

  it("is deterministic across runs", () => {
    const a = buildTrails([...compactLondon, ...parisStops], [], HUB_OPTS);
    const b = buildTrails([...compactLondon, ...parisStops], [], HUB_OPTS);
    expect(a).toEqual(b);
  });
});
