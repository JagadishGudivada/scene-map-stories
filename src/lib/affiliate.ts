// Plan-your-trip outbound link builders. Every partner URL the trip panel
// opens is built here, so parameter sets are edited in one place.
// IDs come from env vars only — never hardcode them.

const env = (key: string): string => {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v?.trim() ?? "";
};

export const TRIP_AFFILIATE_IDS = {
  bookingAid: env("VITE_BOOKING_AID"),
  viatorPid: env("VITE_VIATOR_PID"),
  gygPartnerId: env("VITE_GYG_PARTNER_ID"),
};

export type TripSurface = "hero" | "title_page" | "location_page" | "trail";
export type TripPartner = "booking" | "viator" | "gyg" | "flights";

export interface TripDestination {
  name: string;
  slug: string;
  lat?: number | null;
  lng?: number | null;
}

const slugPart = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "na";

/** sv_{title_slug}_{cluster_slug}_{surface} */
export function buildLabel(titleSlug: string | undefined, clusterSlug: string, surface: TripSurface) {
  return `sv_${slugPart(titleSlug ?? "none")}_${slugPart(clusterSlug)}_${surface}`;
}

const qs = (params: Record<string, string | number | undefined | null>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

export interface StayParams {
  checkin?: string; // YYYY-MM-DD
  checkout?: string;
  guests?: number;
}

export function buildBookingUrl(dest: TripDestination, label: string, stay: StayParams = {}) {
  const hasDates = Boolean(stay.checkin && stay.checkout);
  return `https://www.booking.com/searchresults.html?${qs({
    ss: dest.name,
    latitude: dest.lat ?? undefined,
    longitude: dest.lng ?? undefined,
    checkin: hasDates ? stay.checkin : undefined,
    checkout: hasDates ? stay.checkout : undefined,
    group_adults: stay.guests,
    aid: TRIP_AFFILIATE_IDS.bookingAid || undefined,
    label,
  })}`;
}

export interface FlightParams {
  from: string; // IATA
  to: string; // IATA
  depart?: string;
  ret?: string;
  oneWay: boolean;
}

/** Flights partner not chosen yet. */
export const FLIGHTS_PARTNER_ENABLED = false;

export function buildFlightsUrl(p: FlightParams, _label: string): { url: string; isAffiliate: boolean } {
  // TODO(flights partner): once a partner is chosen, build its deep link here
  // with `_label` attached, and set FLIGHTS_PARTNER_ENABLED = true.
  const parts = [`Flights from ${p.from} to ${p.to}`];
  if (p.depart) parts.push(`on ${p.depart}`);
  if (!p.oneWay && p.ret) parts.push(`returning ${p.ret}`);
  if (p.oneWay) parts.push("one way");
  return {
    url: `https://www.google.com/travel/flights?q=${encodeURIComponent(parts.join(" "))}`,
    isAffiliate: false,
  };
}

export function buildViatorUrl(dest: TripDestination, label: string): string | null {
  if (!TRIP_AFFILIATE_IDS.viatorPid) return null;
  return `https://www.viator.com/searchResults/all?${qs({
    text: dest.name,
    pid: TRIP_AFFILIATE_IDS.viatorPid,
    mcid: "42383",
    medium: "link",
    campaign: label,
  })}`;
}

export function buildGygUrl(dest: TripDestination, label: string): string | null {
  if (!TRIP_AFFILIATE_IDS.gygPartnerId) return null;
  return `https://www.getyourguide.com/s/?${qs({
    q: dest.name,
    partner_id: TRIP_AFFILIATE_IDS.gygPartnerId,
    cmp: label,
  })}`;
}
