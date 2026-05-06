// Central affiliate config. Swap generic URLs for affiliate deep-links here
// (e.g. add `?aid=YOUR_ID`) without touching components.
//
// Sign-up links for partners:
//   Skyscanner Partners       → https://www.partners.skyscanner.net/
//   Booking.com Affiliate     → https://www.booking.com/affiliate-program/
//   GetYourGuide Partner      → https://partner.getyourguide.com/
//   Airalo Partners           → https://www.airalo.com/partners
//   SafetyWing Affiliate      → https://safetywing.com/affiliates
//
// When you have IDs, set them below and update the buildUrl functions.

export const AFFILIATE_IDS = {
  skyscanner: "",   // e.g. "associateid=YOUR_ID"
  booking: "",      // e.g. "aid=YOUR_AID"
  getyourguide: "", // e.g. "partner_id=YOUR_ID"
  airalo: "",       // e.g. "ref=YOUR_REF"
  safetywing: "",   // e.g. "referenceID=YOUR_REF"
};

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
    partner: "skyscanner",
    service: "flights",
    emoji: "✈️",
    label: "Find Flights",
    description: ({ originLabel, locationName }) =>
      `From ${originLabel} → ${locationName}`,
    buildUrl: ({ originQuery, locationName }) => {
      const url = `https://www.google.com/travel/flights?q=${enc(
        `Flights from ${originQuery} to ${locationName}`,
      )}`;
      return appendId(url, AFFILIATE_IDS.skyscanner);
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
