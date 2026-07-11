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
    image: "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=70",
    seenIn: "La Dolce Vita · The Lizzie McGuire Movie",
  },
  {
    id: "fushimi-inari",
    name: "Fushimi Inari Shrine",
    country: "Japan",
    countryIso2: "jp",
    image: "https://images.unsplash.com/photo-1478436127897-769e1538f1a2?auto=format&fit=crop&w=1200&q=70",
    seenIn: "Memoirs of a Geisha",
  },
  {
    id: "highclere-castle",
    name: "Highclere Castle",
    country: "United Kingdom",
    countryIso2: "gb",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=70",
    seenIn: "Downton Abbey",
  },
  {
    id: "dubrovnik",
    name: "Dubrovnik Old Town",
    country: "Croatia",
    countryIso2: "hr",
    image: "https://images.unsplash.com/photo-1555990538-32200142ea41?auto=format&fit=crop&w=1200&q=70",
    seenIn: "Game of Thrones — King's Landing",
  },
  {
    id: "petra",
    name: "Petra",
    country: "Jordan",
    countryIso2: "jo",
    image: "https://images.unsplash.com/photo-1563177978-4c5cf13f65a4?auto=format&fit=crop&w=1200&q=70",
    seenIn: "Indiana Jones and the Last Crusade",
  },
  {
    id: "hobbiton",
    name: "Hobbiton Movie Set",
    country: "New Zealand",
    countryIso2: "nz",
    image: "https://images.unsplash.com/photo-1578912996078-305d92249aa6?auto=format&fit=crop&w=1200&q=70",
    seenIn: "The Lord of the Rings",
  },
  {
    id: "central-park",
    name: "Central Park",
    country: "United States",
    countryIso2: "us",
    image: "https://images.unsplash.com/photo-1543716091-a840c05249ec?auto=format&fit=crop&w=1200&q=70",
    seenIn: "When Harry Met Sally · Home Alone 2",
  },
  {
    id: "monument-valley",
    name: "Monument Valley",
    country: "United States",
    countryIso2: "us",
    image: "https://images.unsplash.com/photo-1516715094483-75da7dee9758?auto=format&fit=crop&w=1200&q=70",
    seenIn: "Forrest Gump · Once Upon a Time in the West",
  },
];
