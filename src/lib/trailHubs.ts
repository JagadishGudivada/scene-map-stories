// A "trail hub" is a major city that anchors a "Day Trip from X" trail: a
// curated cluster of filming/setting locations in satellite towns within a
// day-trip radius of the hub's centre. This list is intentionally curated
// (not derived), hand-picked for real-world screen-tourism relevance, and
// meant to be edited directly as coverage grows — add/remove hubs here.

export type TrailHub = {
  key: string; // lowercase, trimmed, single-spaced city name, no country: "london", "new york"
  name: string; // display name: "London", "New York"
  lat: number; // city-centre latitude
  lng: number; // city-centre longitude
};

export const DAY_TRIP_RADIUS_KM = 120;

export const TRAIL_HUBS: TrailHub[] = [
  { key: "london", name: "London", lat: 51.5074, lng: -0.1278 },
  { key: "paris", name: "Paris", lat: 48.8566, lng: 2.3522 },
  { key: "new york", name: "New York", lat: 40.7128, lng: -74.0060 },
  { key: "los angeles", name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { key: "tokyo", name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { key: "rome", name: "Rome", lat: 41.9028, lng: 12.4964 },
  { key: "edinburgh", name: "Edinburgh", lat: 55.9533, lng: -3.1883 },
  { key: "dublin", name: "Dublin", lat: 53.3498, lng: -6.2603 },
  { key: "barcelona", name: "Barcelona", lat: 41.3851, lng: 2.1734 },
  { key: "berlin", name: "Berlin", lat: 52.5200, lng: 13.4050 },
  { key: "prague", name: "Prague", lat: 50.0755, lng: 14.4378 },
  { key: "vienna", name: "Vienna", lat: 48.2082, lng: 16.3738 },
  { key: "sydney", name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { key: "wellington", name: "Wellington", lat: -41.2865, lng: 174.7762 },
  { key: "seoul", name: "Seoul", lat: 37.5665, lng: 126.9780 },
  { key: "mumbai", name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { key: "vancouver", name: "Vancouver", lat: 49.2827, lng: -123.1207 },
  { key: "toronto", name: "Toronto", lat: 43.6532, lng: -79.3832 },
  { key: "atlanta", name: "Atlanta", lat: 33.7490, lng: -84.3880 },
  { key: "san francisco", name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { key: "chicago", name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { key: "dubrovnik", name: "Dubrovnik", lat: 42.6507, lng: 18.0944 },
  { key: "reykjavik", name: "Reykjavik", lat: 64.1466, lng: -21.9426 },
];
