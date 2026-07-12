export type IconicLocation = {
  id: string;
  name: string;
  country: string;
  countryIso2: string; // for flag-icons: fi fi-{iso2}
  image: string;
  seenIn: string; // e.g. "La Dolce Vita, The Lizzie McGuire Movie"
};

// Curated, seeded set of instantly-recognisable filming landmarks.
// Images use Unsplash source URLs (stable, no key required).
export const ICONIC_LOCATIONS: IconicLocation[] = [
  {
    id: "trevi-fountain",
    name: "Trevi Fountain",
    country: "Italy",
    countryIso2: "it",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    seenIn: "La Dolce Vita · The Lizzie McGuire Movie",
  },
  {
    id: "fushimi-inari",
    name: "Fushimi Inari Shrine",
    country: "Japan",
    countryIso2: "jp",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    seenIn: "Memoirs of a Geisha",
  },
  {
    id: "highclere-castle",
    name: "Highclere Castle",
    country: "United Kingdom",
    countryIso2: "gb",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    seenIn: "Downton Abbey",
  },
  {
    id: "dubrovnik",
    name: "Dubrovnik Old Town",
    country: "Croatia",
    countryIso2: "hr",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    seenIn: "Game of Thrones — King's Landing",
  },
  {
    id: "petra",
    name: "Petra",
    country: "Jordan",
    countryIso2: "jo",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    seenIn: "Indiana Jones and the Last Crusade",
  },
  {
    id: "hobbiton",
    name: "Hobbiton Movie Set",
    country: "New Zealand",
    countryIso2: "nz",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    seenIn: "The Lord of the Rings",
  },
  {
    id: "central-park",
    name: "Central Park",
    country: "United States",
    countryIso2: "us",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    seenIn: "When Harry Met Sally · Home Alone 2",
  },
  {
    id: "monument-valley",
    name: "Monument Valley",
    country: "United States",
    countryIso2: "us",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
    seenIn: "Forrest Gump · Once Upon a Time in the West",
  },
];
