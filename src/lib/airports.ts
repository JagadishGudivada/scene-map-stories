export interface Airport {
  iata: string;
  city: string;
  country: string; // ISO2
}

export const AIRPORTS: Airport[] = [
  { iata: "LHR", city: "London Heathrow", country: "GB" },
  { iata: "LGW", city: "London Gatwick", country: "GB" },
  { iata: "STN", city: "London Stansted", country: "GB" },
  { iata: "MAN", city: "Manchester", country: "GB" },
  { iata: "BHX", city: "Birmingham", country: "GB" },
  { iata: "BRS", city: "Bristol", country: "GB" },
  { iata: "EDI", city: "Edinburgh", country: "GB" },
  { iata: "GLA", city: "Glasgow", country: "GB" },
  { iata: "PIK", city: "Glasgow Prestwick", country: "GB" },
  { iata: "INV", city: "Inverness", country: "GB" },
  { iata: "ABZ", city: "Aberdeen", country: "GB" },
  { iata: "BFS", city: "Belfast", country: "GB" },
  { iata: "NCL", city: "Newcastle", country: "GB" },
  { iata: "LBA", city: "Leeds Bradford", country: "GB" },
  { iata: "CWL", city: "Cardiff", country: "GB" },
  { iata: "DUB", city: "Dublin", country: "IE" },
  { iata: "CDG", city: "Paris Charles de Gaulle", country: "FR" },
  { iata: "AMS", city: "Amsterdam", country: "NL" },
  { iata: "FRA", city: "Frankfurt", country: "DE" },
  { iata: "BER", city: "Berlin", country: "DE" },
  { iata: "MAD", city: "Madrid", country: "ES" },
  { iata: "BCN", city: "Barcelona", country: "ES" },
  { iata: "LIS", city: "Lisbon", country: "PT" },
  { iata: "FCO", city: "Rome Fiumicino", country: "IT" },
  { iata: "MXP", city: "Milan Malpensa", country: "IT" },
  { iata: "CTA", city: "Catania", country: "IT" },
  { iata: "ATH", city: "Athens", country: "GR" },
  { iata: "JTR", city: "Santorini", country: "GR" },
  { iata: "DBV", city: "Dubrovnik", country: "HR" },
  { iata: "KEF", city: "Reykjavik", country: "IS" },
  { iata: "OSL", city: "Oslo", country: "NO" },
  { iata: "CPH", city: "Copenhagen", country: "DK" },
  { iata: "ARN", city: "Stockholm", country: "SE" },
  { iata: "ZRH", city: "Zurich", country: "CH" },
  { iata: "VIE", city: "Vienna", country: "AT" },
  { iata: "PRG", city: "Prague", country: "CZ" },
  { iata: "IST", city: "Istanbul", country: "TR" },
  { iata: "DXB", city: "Dubai", country: "AE" },
  { iata: "DEL", city: "Delhi", country: "IN" },
  { iata: "BOM", city: "Mumbai", country: "IN" },
  { iata: "BLR", city: "Bengaluru", country: "IN" },
  { iata: "SIN", city: "Singapore", country: "SG" },
  { iata: "HND", city: "Tokyo Haneda", country: "JP" },
  { iata: "NRT", city: "Tokyo Narita", country: "JP" },
  { iata: "KIX", city: "Osaka Kansai", country: "JP" },
  { iata: "ICN", city: "Seoul Incheon", country: "KR" },
  { iata: "HKG", city: "Hong Kong", country: "HK" },
  { iata: "BKK", city: "Bangkok", country: "TH" },
  { iata: "SYD", city: "Sydney", country: "AU" },
  { iata: "MEL", city: "Melbourne", country: "AU" },
  { iata: "AKL", city: "Auckland", country: "NZ" },
  { iata: "ZQN", city: "Queenstown", country: "NZ" },
  { iata: "JFK", city: "New York JFK", country: "US" },
  { iata: "EWR", city: "Newark", country: "US" },
  { iata: "LAX", city: "Los Angeles", country: "US" },
  { iata: "SFO", city: "San Francisco", country: "US" },
  { iata: "ORD", city: "Chicago O'Hare", country: "US" },
  { iata: "ATL", city: "Atlanta", country: "US" },
  { iata: "MIA", city: "Miami", country: "US" },
  { iata: "SEA", city: "Seattle", country: "US" },
  { iata: "BOS", city: "Boston", country: "US" },
  { iata: "YYZ", city: "Toronto", country: "CA" },
  { iata: "YVR", city: "Vancouver", country: "CA" },
  { iata: "MEX", city: "Mexico City", country: "MX" },
  { iata: "GRU", city: "São Paulo", country: "BR" },
  { iata: "JNB", city: "Johannesburg", country: "ZA" },
  { iata: "CPT", city: "Cape Town", country: "ZA" },
  { iata: "RAK", city: "Marrakesh", country: "MA" },
  { iata: "CAI", city: "Cairo", country: "EG" },
];

const COUNTRY_DEFAULT: Record<string, string> = {
  GB: "LHR", IE: "DUB", FR: "CDG", NL: "AMS", DE: "FRA", ES: "MAD", PT: "LIS", IT: "FCO",
  GR: "ATH", US: "JFK", CA: "YYZ", AU: "SYD", NZ: "AKL", IN: "DEL", JP: "HND", KR: "ICN",
  SG: "SIN", AE: "DXB", ZA: "JNB", BR: "GRU", MX: "MEX", CH: "ZRH", AT: "VIE", SE: "ARN",
  NO: "OSL", DK: "CPH", IS: "KEF", TR: "IST", HK: "HKG", TH: "BKK", CZ: "PRG",
};

const STORAGE_KEY = "sv_home_airport";

export function getHomeAirport(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch { /* ignore */ }
  const region = (typeof navigator !== "undefined" ? navigator.language : "").split("-")[1]?.toUpperCase();
  return (region && COUNTRY_DEFAULT[region]) || "LHR";
}

export function setHomeAirport(iata: string) {
  try { localStorage.setItem(STORAGE_KEY, iata); } catch { /* ignore */ }
}

export function searchAirports(q: string, limit = 6): Airport[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return AIRPORTS.filter(
    (a) => a.iata.toLowerCase().startsWith(s) || a.city.toLowerCase().includes(s),
  ).slice(0, limit);
}

export const airportLabel = (iata: string) => {
  const a = AIRPORTS.find((x) => x.iata === iata);
  return a ? `${a.city} (${a.iata})` : iata;
};
