import tokyoImg from "@/assets/location-tokyo.jpg";
import londonImg from "@/assets/location-london.jpg";
import nycImg from "@/assets/location-nyc.jpg";
import santoriniImg from "@/assets/location-santorini.jpg";
import kyotoImg from "@/assets/location-kyoto.jpg";
import heroRomeImg from "@/assets/hero-rome.jpg";
import heroEdinburghImg from "@/assets/hero-edinburgh.jpg";

export type MediaType = "Movie" | "Series" | "Book";

export interface Title {
  id: string;
  title: string;
  year: number;
  type: MediaType;
  coverImage: string;
  locationCount: number;
  rating: number;
  locations: string[];
  genres: string[];
}

export interface Post {
  id: string;
  user: User;
  image: string;
  caption: string;
  locationTag: string;
  titleTag: string;
  likes: number;
  comments: number;
  timeAgo: string;
  saved: boolean;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  location: string;
  coverImage: string;
  titlesSaved: number;
  locationsMapped: number;
  followers: number;
  following: number;
}

export const mockTitles: Title[] = [
  {
    id: "1",
    title: "Lost in Translation",
    year: 2003,
    type: "Movie",
    coverImage: tokyoImg,
    locationCount: 12,
    rating: 8.8,
    locations: ["Tokyo", "Shinjuku", "Park Hyatt"],
    genres: ["Drama", "Romance"],
  },
  {
    id: "2",
    title: "Sherlock",
    year: 2010,
    type: "Series",
    coverImage: londonImg,
    locationCount: 28,
    rating: 9.1,
    locations: ["London", "Baker Street", "Greenwich"],
    genres: ["Crime", "Mystery"],
  },
  {
    id: "3",
    title: "The Secret",
    year: 2006,
    type: "Book",
    coverImage: nycImg,
    locationCount: 5,
    rating: 7.4,
    locations: ["New York", "Manhattan", "Brooklyn Bridge"],
    genres: ["Self-help", "Philosophy"],
  },
  {
    id: "4",
    title: "Mamma Mia",
    year: 2008,
    type: "Movie",
    coverImage: santoriniImg,
    locationCount: 9,
    rating: 7.0,
    locations: ["Skopelos", "Santorini", "Aegean Islands"],
    genres: ["Musical", "Romance"],
  },
  {
    id: "5",
    title: "Memoirs of a Geisha",
    year: 2005,
    type: "Movie",
    coverImage: kyotoImg,
    locationCount: 16,
    rating: 7.4,
    locations: ["Kyoto", "Fushimi Inari", "Gion"],
    genres: ["Drama", "Romance"],
  },
  {
    id: "6",
    title: "Outlander",
    year: 2014,
    type: "Series",
    coverImage: heroEdinburghImg,
    locationCount: 34,
    rating: 8.4,
    locations: ["Edinburgh", "Highlands", "Doune Castle"],
    genres: ["Drama", "Fantasy"],
  },
];

export const mockPosts: Post[] = [
  {
    id: "p1",
    user: {
      id: "u1",
      username: "arianafletcher",
      displayName: "Ariana Fletcher",
      avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=ariana",
      bio: "Film pilgrim. Always chasing the shot.",
      location: "Barcelona, Spain",
      coverImage: heroRomeImg,
      titlesSaved: 94,
      locationsMapped: 47,
      followers: 2840,
      following: 312,
    },
    image: tokyoImg,
    caption: "Standing exactly where Bill Murray sat in Lost in Translation. The neon didn't disappoint ✨",
    locationTag: "Shinjuku, Tokyo 🇯🇵",
    titleTag: "Lost in Translation (2003)",
    likes: 1247,
    comments: 89,
    timeAgo: "2h ago",
    saved: false,
  },
  {
    id: "p2",
    user: {
      id: "u2",
      username: "marcusvieira",
      displayName: "Marcus Vieira",
      avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=marcus",
      bio: "Cinematography lover. 60 countries, 400 films.",
      location: "Lisbon, Portugal",
      coverImage: heroEdinburghImg,
      titlesSaved: 211,
      locationsMapped: 128,
      followers: 8900,
      following: 450,
    },
    image: londonImg,
    caption: "221B Baker Street at 6AM. Completely empty. Surreal. Thank you Sherlock for making me do this.",
    locationTag: "Baker Street, London 🇬🇧",
    titleTag: "Sherlock (BBC, 2010)",
    likes: 3412,
    comments: 234,
    timeAgo: "5h ago",
    saved: true,
  },
  {
    id: "p3",
    user: {
      id: "u3",
      username: "sophiekim",
      displayName: "Sophie Kim",
      avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=sophie",
      bio: "Books → places → memories.",
      location: "Seoul, Korea",
      coverImage: nycImg,
      titlesSaved: 67,
      locationsMapped: 31,
      followers: 1200,
      following: 198,
    },
    image: santoriniImg,
    caption: "Mamma Mia filmed HERE. I cried. Still crying. The blue is not real.",
    locationTag: "Skopelos, Greece 🇬🇷",
    titleTag: "Mamma Mia (2008)",
    likes: 5670,
    comments: 412,
    timeAgo: "1d ago",
    saved: false,
  },
];

export const mockUser: User = {
  id: "u0",
  username: "elenarossi",
  displayName: "Elena Rossi",
  avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=elena",
  bio: "Cinema is geography. I map the frames. 🎞️ Rome-born, world-roaming.",
  location: "Rome, Italy 🇮🇹",
  coverImage: heroRomeImg,
  titlesSaved: 142,
  locationsMapped: 73,
  followers: 5640,
  following: 389,
};

export const popularLocations = [
  { name: "New York City", country: "🇺🇸", count: 47 },
  { name: "London", country: "🇬🇧", count: 38 },
  { name: "Tokyo", country: "🇯🇵", count: 29 },
  { name: "Paris", country: "🇫🇷", count: 35 },
  { name: "Rome", country: "🇮🇹", count: 22 },
  { name: "Edinburgh", country: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", count: 18 },
  { name: "Kyoto", country: "🇯🇵", count: 15 },
  { name: "Santorini", country: "🇬🇷", count: 12 },
];

export const heroSlides = [
  {
    id: "h1",
    title: "Lost in Translation",
    year: 2003,
    type: "Movie" as MediaType,
    image: tokyoImg,
    locationTag: "Tokyo, Japan",
    tagline: "12 filming locations discovered",
  },
  {
    id: "h2",
    title: "Outlander",
    year: 2014,
    type: "Series" as MediaType,
    image: heroEdinburghImg,
    locationTag: "Scottish Highlands",
    tagline: "34 filming locations discovered",
  },
  {
    id: "h3",
    title: "Gladiator",
    year: 2000,
    type: "Movie" as MediaType,
    image: heroRomeImg,
    locationTag: "Rome, Italy",
    tagline: "19 filming locations discovered",
  },
];
