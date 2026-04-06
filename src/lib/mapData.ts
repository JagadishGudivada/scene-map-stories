import type { MapPin } from "@/components/LeafletMap";

export interface EnrichedMapPin extends MapPin {
  description?: string;
  city?: string;
}

export const allMapPins: MapPin[] = [
  { lat: 35.6762, lng: 139.6503, label: "Shinjuku", title: "Lost in Translation", type: "Movie", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop" },
  { lat: 35.6586, lng: 139.7454, label: "Park Hyatt Tokyo", title: "Lost in Translation", type: "Movie", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop" },
  { lat: 51.5238, lng: -0.1585, label: "Baker Street", title: "Sherlock", type: "Series", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop" },
  { lat: 51.4769, lng: -0.0005, label: "Greenwich", title: "Sherlock", type: "Series", image: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=600&h=400&fit=crop" },
  { lat: 40.7061, lng: -73.9969, label: "Brooklyn Bridge", title: "The Secret", type: "Book", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=400&fit=crop" },
  { lat: 40.7484, lng: -73.9857, label: "Manhattan", title: "The Secret", type: "Book", image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&h=400&fit=crop" },
  { lat: 36.4618, lng: 25.3753, label: "Santorini", title: "Mamma Mia", type: "Movie", image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&h=400&fit=crop" },
  { lat: 39.122, lng: 23.7275, label: "Skopelos", title: "Mamma Mia", type: "Movie", image: "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?w=600&h=400&fit=crop" },
  { lat: 34.9671, lng: 135.7727, label: "Fushimi Inari", title: "Memoirs of a Geisha", type: "Movie", image: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=600&h=400&fit=crop" },
  { lat: 35.0039, lng: 135.7786, label: "Gion District", title: "Memoirs of a Geisha", type: "Movie", image: "https://images.unsplash.com/photo-1493997181344-712f2f19d87a?w=600&h=400&fit=crop" },
  { lat: 55.9533, lng: -3.1883, label: "Edinburgh", title: "Outlander", type: "Series", image: "https://images.unsplash.com/photo-1506377585622-bedcbb5f6789?w=600&h=400&fit=crop" },
  { lat: 56.1852, lng: -4.0509, label: "Doune Castle", title: "Outlander", type: "Series", image: "https://images.unsplash.com/photo-1565098772267-60af42b81ef2?w=600&h=400&fit=crop" },
  { lat: 41.8902, lng: 12.4922, label: "Colosseum", title: "Gladiator", type: "Movie", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=400&fit=crop" },
  { lat: 48.8566, lng: 2.3522, label: "Paris", title: "Midnight in Paris", type: "Movie", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop" },
  { lat: 48.8584, lng: 2.2945, label: "Eiffel Tower", title: "Midnight in Paris", type: "Movie", image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=600&h=400&fit=crop" },
];

export const titleLocationPins: Record<string, EnrichedMapPin[]> = {
  "lost-in-translation-2003": [
    { lat: 35.6762, lng: 139.6503, label: "Shinjuku", title: "Lost in Translation", type: "Movie", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop", city: "Tokyo, Japan", description: "Bob Harris wanders the neon-lit streets of Shinjuku, capturing the disorienting beauty of Tokyo nightlife." },
    { lat: 35.6586, lng: 139.7454, label: "Park Hyatt Tokyo", title: "Lost in Translation", type: "Movie", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop", city: "Tokyo, Japan", description: "The iconic hotel where Bob and Charlotte meet at the New York Bar on the 52nd floor." },
    { lat: 35.6595, lng: 139.7004, label: "Shibuya Crossing", title: "Lost in Translation", type: "Movie", image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&h=400&fit=crop", city: "Tokyo, Japan", description: "The world's busiest pedestrian crossing, featured in multiple scenes showing Tokyo's overwhelming energy." },
  ],
  "sherlock-2010": [
    { lat: 51.5238, lng: -0.1585, label: "Baker Street", title: "Sherlock", type: "Series", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop", city: "London, UK", description: "221B Baker Street — the legendary address of Sherlock Holmes and Dr. Watson." },
    { lat: 51.4769, lng: -0.0005, label: "Greenwich", title: "Sherlock", type: "Series", image: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=600&h=400&fit=crop", city: "London, UK", description: "The Royal Naval College doubles as various government buildings throughout the series." },
    { lat: 51.5014, lng: -0.1419, label: "Buckingham Palace", title: "Sherlock", type: "Series", image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&h=400&fit=crop", city: "London, UK", description: "Sherlock visits the Palace wrapped only in a bedsheet — a memorably irreverent scene." },
  ],
  "mamma-mia-2008": [
    { lat: 36.4618, lng: 25.3753, label: "Santorini", title: "Mamma Mia", type: "Movie", image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&h=400&fit=crop", city: "Santorini, Greece", description: "The sun-bleached caldera provided backdrop shots for the fictional island of Kalokairi." },
    { lat: 39.122, lng: 23.7275, label: "Skopelos", title: "Mamma Mia", type: "Movie", image: "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?w=600&h=400&fit=crop", city: "Skopelos, Greece", description: "The main filming location — Kastani Beach hosted the famous 'Dancing Queen' pier scene." },
  ],
  "memoirs-of-a-geisha-2005": [
    { lat: 34.9671, lng: 135.7727, label: "Fushimi Inari", title: "Memoirs of a Geisha", type: "Movie", image: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=600&h=400&fit=crop", city: "Kyoto, Japan", description: "Young Chiyo runs through thousands of vermilion torii gates in this unforgettable sequence." },
    { lat: 35.0039, lng: 135.7786, label: "Gion District", title: "Memoirs of a Geisha", type: "Movie", image: "https://images.unsplash.com/photo-1493997181344-712f2f19d87a?w=600&h=400&fit=crop", city: "Kyoto, Japan", description: "The historic geisha quarter where Sayuri navigates the flower-and-willow world." },
  ],
  "outlander-2014": [
    { lat: 55.9533, lng: -3.1883, label: "Edinburgh", title: "Outlander", type: "Series", image: "https://images.unsplash.com/photo-1506377585622-bedcbb5f6789?w=600&h=400&fit=crop", city: "Edinburgh, Scotland", description: "Claire's 20th-century life unfolds against the dramatic backdrop of Edinburgh's Old Town." },
    { lat: 56.1852, lng: -4.0509, label: "Doune Castle", title: "Outlander", type: "Series", image: "https://images.unsplash.com/photo-1565098772267-60af42b81ef2?w=600&h=400&fit=crop", city: "Stirling, Scotland", description: "Castle Leoch in the series — the seat of Clan MacKenzie where Claire is first brought." },
    { lat: 57.4778, lng: -4.2247, label: "Inverness", title: "Outlander", type: "Series", image: "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?w=600&h=400&fit=crop", city: "Inverness, Scotland", description: "The Highland capital near Craigh na Dun, where Claire falls through the standing stones." },
  ],
};
