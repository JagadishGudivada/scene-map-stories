export type TrendingSpot = {
  id: string;
  venueName: string;
  venueType: "Café" | "Hotel" | "Restaurant" | "Bar" | "Bakery";
  viral?: boolean;
  city: string;
  countryIso2: string;
  image: string;
  asSeenIn: string; // "Emily in Paris"
  year: number;
  sceneLine: string; // scene-specific, not a generic venue description
  hashtag: string;
  mapQuery: string; // used to plan a visit
};

export const TRENDING_ON_SCREEN: TrendingSpot[] = [
  {
    id: "carette-paris",
    venueName: "Carette",
    venueType: "Café",
    viral: true,
    city: "Paris",
    countryIso2: "fr",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    asSeenIn: "Emily in Paris",
    year: 2024,
    sceneLine: "Where Emily picks up her morning croissant in S4E2 — and the queue hasn't stopped since.",
    hashtag: "#EmilyInParisCafe",
    mapQuery: "Carette Paris Trocadero",
  },
  {
    id: "hotel-du-cap",
    venueName: "Hôtel du Cap-Eden-Roc",
    venueType: "Hotel",
    city: "Antibes",
    countryIso2: "fr",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    asSeenIn: "The White Lotus",
    year: 2025,
    sceneLine: "The lounger scene everyone screenshotted — same infinity edge, same view.",
    hashtag: "#WhiteLotusMed",
    mapQuery: "Hotel du Cap-Eden-Roc Antibes",
  },
  {
    id: "bar-basso",
    venueName: "Bar Basso",
    venueType: "Bar",
    viral: true,
    city: "Milan",
    countryIso2: "it",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    asSeenIn: "House of Gucci",
    year: 2021,
    sceneLine: "The Negroni Sbagliato that turned into a global TikTok — poured at this exact counter.",
    hashtag: "#NegroniSbagliato",
    mapQuery: "Bar Basso Milano",
  },
  {
    id: "the-savoy",
    venueName: "The Savoy",
    venueType: "Hotel",
    city: "London",
    countryIso2: "gb",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    asSeenIn: "The Crown",
    year: 2023,
    sceneLine: "The tea-room reunion in S5 — booth on the left, exactly as filmed.",
    hashtag: "#TheCrownTea",
    mapQuery: "The Savoy Hotel London",
  },
  {
    id: "tokyo-omoide",
    venueName: "Omoide Yokocho",
    venueType: "Restaurant",
    viral: true,
    city: "Tokyo",
    countryIso2: "jp",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    asSeenIn: "Tokyo Vice",
    year: 2024,
    sceneLine: "The alley scene at 2am — walk it slowly, every neon frame is a shot from the show.",
    hashtag: "#TokyoViceAlley",
    mapQuery: "Omoide Yokocho Shinjuku",
  },
];
