// Central affiliate config — the single place where outbound money links are built.
//
// HOW TO EARN
// 1. Sign up for the programmes below and copy your partner/affiliate identifier.
// 2. Paste each one into AFFILIATE_IDS as a ready-made query fragment
//    ("param=value"). appendId() attaches it to every URL that partner builds.
// 3. Rebuild + redeploy (`npm run build && npx wrangler deploy --env production`)
//    — these IDs are inlined into the client bundle at build time.
//
//   Travelpayouts (flights)   → https://www.travelpayouts.com/  (marker=XXXXXX)
//                               easiest approval; aggregates Aviasales/Skyscanner inventory
//   Skyscanner Partners       → https://www.partners.skyscanner.net/  (associateid=XXXX)
//   Booking.com Affiliate     → https://www.booking.com/affiliate-program/  (aid=XXXXXXX)
//   GetYourGuide Partner      → https://partner.getyourguide.com/  (partner_id=XXXXXX)
//   Airalo Partners           → https://www.airalo.com/partners  (ref=XXXXXX)
//   SafetyWing Affiliate      → https://safetywing.com/affiliates  (referenceID=XXXXXX)
//
// These are PUBLIC identifiers (they travel in the URL), so they belong in code —
// not in the secrets store. Optionally override any of them at build time with a
// VITE_AFF_* env var so you can ship test IDs locally and real IDs in production.
//
// Every click is logged to the `affiliate_clicks` table via trackAffiliateClick(),
// so you can compare our click counts against each partner dashboard and catch
// deep links that silently lost attribution.

const env = (key: string): string | undefined => {
  try {
    return (import.meta as unknown as { env?: Record<string, string> }).env?.[key] || undefined;
  } catch {
    return undefined;
  }
};

export const AFFILIATE_IDS = {
  /** Travelpayouts marker — powers the flights card. e.g. "marker=123456" */
  travelpayouts: env("VITE_AFF_TRAVELPAYOUTS") ?? "",
  skyscanner: env("VITE_AFF_SKYSCANNER") ?? "",     // e.g. "associateid=YOUR_ID"
  booking: env("VITE_AFF_BOOKING") ?? "",           // e.g. "aid=YOUR_AID"
  getyourguide: env("VITE_AFF_GETYOURGUIDE") ?? "", // e.g. "partner_id=YOUR_ID"
  airalo: env("VITE_AFF_AIRALO") ?? "",             // e.g. "ref=YOUR_REF"
  safetywing: env("VITE_AFF_SAFETYWING") ?? "",     // e.g. "referenceID=YOUR_REF"
};

/** True once at least one partner ID is configured (useful for QA/tests). */
export const hasAffiliateIds = () =>
  Object.values(AFFILIATE_IDS).some((v) => v.trim().length > 0);


export type AffiliateService =
  | "flights"
  | "hotels"
  | "directions"
  | "tours"
  | "esim"
  | "insurance";

export interface AffiliateCtx {
  /** User-facing origin label, e.g. "London (LHR)" */
  originLabel: string;
  /** Origin query string used to build URLs (city or IATA) */
  originQuery: string;
  /** Destination city / location name */
  locationName: string;
  /** Optional spot or landmark for richer queries */
  spotName?: string;
  /** Latitude for directions/lat-based deep links */
  lat?: number;
  /** Longitude for directions/lat-based deep links */
  lng?: number;
}

export interface AffiliatePartner {
  /** Stable id stored in the click log */
  partner: string;
  service: AffiliateService;
  emoji: string;
  label: string;
  /** Short description shown on the card */
  description: (ctx: AffiliateCtx) => string;
  /** Builds the outbound URL */
  buildUrl: (ctx: AffiliateCtx) => string;
}

const enc = encodeURIComponent;

const appendId = (url: string, idParam: string) =>
  idParam ? `${url}${url.includes("?") ? "&" : "?"}${idParam}` : url;

export const AFFILIATE_PARTNERS: AffiliatePartner[] = [
  {
    // Flights: earns via Travelpayouts (preferred) or Skyscanner Partners.
    // With no ID configured it degrades to a plain Google Flights search so the
    // card still works for users — it just earns nothing until you paste an ID.
    partner: "flights",
    service: "flights",
    emoji: "✈️",
    label: "Find Flights",
    description: ({ originLabel, locationName }) =>
      `From ${originLabel} → ${locationName}`,
    buildUrl: ({ originQuery, locationName }) => {
      const origin = enc(originQuery);
      const destination = enc(locationName);

      if (AFFILIATE_IDS.travelpayouts) {
        // Travelpayouts white-label flight search (aviasales inventory).
        return appendId(
          `https://www.aviasales.com/search?origin_name=${origin}&destination_name=${destination}`,
          AFFILIATE_IDS.travelpayouts,
        );
      }

      if (AFFILIATE_IDS.skyscanner) {
        return appendId(
          `https://www.skyscanner.net/transport/flights/?origin=${origin}&destination=${destination}`,
          AFFILIATE_IDS.skyscanner,
        );
      }

      return `https://www.google.com/travel/flights?q=${enc(
        `Flights from ${originQuery} to ${locationName}`,
      )}`;
    },
  },

  {
    partner: "booking",
    service: "hotels",
    emoji: "🏨",
    label: "Find Hotels",
    description: ({ spotName, locationName }) =>
      `Stays near ${spotName ?? locationName}`,
    buildUrl: ({ spotName, locationName }) => {
      const q = spotName ? `${spotName}, ${locationName}` : locationName;
      const url = `https://www.booking.com/searchresults.html?ss=${enc(q)}`;
      return appendId(url, AFFILIATE_IDS.booking);
    },
  },
  {
    partner: "getyourguide",
    service: "tours",
    emoji: "🎟️",
    label: "Tours & Tickets",
    description: ({ locationName }) =>
      `Skip-the-line tours in ${locationName}`,
    buildUrl: ({ locationName, spotName }) => {
      const q = spotName ? `${spotName} ${locationName}` : locationName;
      const url = `https://www.getyourguide.com/s/?q=${enc(q)}`;
      return appendId(url, AFFILIATE_IDS.getyourguide);
    },
  },
  {
    partner: "airalo",
    service: "esim",
    emoji: "📶",
    label: "Get an eSIM",
    description: ({ locationName }) =>
      `Stay online in ${locationName} — no roaming`,
    buildUrl: ({ locationName }) => {
      const slug = locationName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const url = `https://www.airalo.com/${slug}-esim`;
      return appendId(url, AFFILIATE_IDS.airalo);
    },
  },
  {
    partner: "safetywing",
    service: "insurance",
    emoji: "🛡️",
    label: "Travel Insurance",
    description: () => "Nomad cover from $45/4 weeks",
    buildUrl: () => {
      const url = "https://safetywing.com/nomad-insurance";
      return appendId(url, AFFILIATE_IDS.safetywing);
    },
  },
  {
    partner: "google_maps",
    service: "directions",
    emoji: "📍",
    label: "Get Directions",
    description: ({ lat, lng }) =>
      lat && lng ? "Open route in Google Maps" : "Open in Google Maps",
    buildUrl: ({ lat, lng, spotName, locationName }) => {
      if (typeof lat === "number" && typeof lng === "number") {
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      }
      const q = spotName ? `${spotName}, ${locationName}` : locationName;
      return `https://www.google.com/maps/search/?api=1&query=${enc(q)}`;
    },
  },
];
