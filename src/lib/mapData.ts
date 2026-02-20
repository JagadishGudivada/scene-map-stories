import type { MapPin } from "@/components/LeafletMap";

export const allMapPins: MapPin[] = [
  { lat: 35.6762, lng: 139.6503, label: "Shinjuku", title: "Lost in Translation", type: "Movie" },
  { lat: 35.6586, lng: 139.7454, label: "Park Hyatt Tokyo", title: "Lost in Translation", type: "Movie" },
  { lat: 51.5238, lng: -0.1585, label: "Baker Street", title: "Sherlock", type: "Series" },
  { lat: 51.4769, lng: -0.0005, label: "Greenwich", title: "Sherlock", type: "Series" },
  { lat: 40.7061, lng: -73.9969, label: "Brooklyn Bridge", title: "The Secret", type: "Book" },
  { lat: 40.7484, lng: -73.9857, label: "Manhattan", title: "The Secret", type: "Book" },
  { lat: 36.4618, lng: 25.3753, label: "Santorini", title: "Mamma Mia", type: "Movie" },
  { lat: 39.122, lng: 23.7275, label: "Skopelos", title: "Mamma Mia", type: "Movie" },
  { lat: 34.9671, lng: 135.7727, label: "Fushimi Inari", title: "Memoirs of a Geisha", type: "Movie" },
  { lat: 35.0039, lng: 135.7786, label: "Gion District", title: "Memoirs of a Geisha", type: "Movie" },
  { lat: 55.9533, lng: -3.1883, label: "Edinburgh", title: "Outlander", type: "Series" },
  { lat: 56.1852, lng: -4.0509, label: "Doune Castle", title: "Outlander", type: "Series" },
  { lat: 41.8902, lng: 12.4922, label: "Colosseum", title: "Gladiator", type: "Movie" },
  { lat: 48.8566, lng: 2.3522, label: "Paris", title: "Midnight in Paris", type: "Movie" },
  { lat: 48.8584, lng: 2.2945, label: "Eiffel Tower", title: "Midnight in Paris", type: "Movie" },
];

export const titleLocationPins: Record<string, MapPin[]> = {
  "lost-in-translation-2003": [
    { lat: 35.6762, lng: 139.6503, label: "Shinjuku", title: "Lost in Translation", type: "Movie" },
    { lat: 35.6586, lng: 139.7454, label: "Park Hyatt Tokyo", title: "Lost in Translation", type: "Movie" },
    { lat: 35.6595, lng: 139.7004, label: "Shibuya Crossing", title: "Lost in Translation", type: "Movie" },
  ],
  "sherlock-2010": [
    { lat: 51.5238, lng: -0.1585, label: "Baker Street", title: "Sherlock", type: "Series" },
    { lat: 51.4769, lng: -0.0005, label: "Greenwich", title: "Sherlock", type: "Series" },
    { lat: 51.5014, lng: -0.1419, label: "Buckingham Palace", title: "Sherlock", type: "Series" },
  ],
  "mamma-mia-2008": [
    { lat: 36.4618, lng: 25.3753, label: "Santorini", title: "Mamma Mia", type: "Movie" },
    { lat: 39.122, lng: 23.7275, label: "Skopelos", title: "Mamma Mia", type: "Movie" },
  ],
  "memoirs-of-a-geisha-2005": [
    { lat: 34.9671, lng: 135.7727, label: "Fushimi Inari", title: "Memoirs of a Geisha", type: "Movie" },
    { lat: 35.0039, lng: 135.7786, label: "Gion District", title: "Memoirs of a Geisha", type: "Movie" },
  ],
  "outlander-2014": [
    { lat: 55.9533, lng: -3.1883, label: "Edinburgh", title: "Outlander", type: "Series" },
    { lat: 56.1852, lng: -4.0509, label: "Doune Castle", title: "Outlander", type: "Series" },
    { lat: 57.4778, lng: -4.2247, label: "Inverness", title: "Outlander", type: "Series" },
  ],
};
