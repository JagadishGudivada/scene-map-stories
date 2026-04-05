export interface FilmingSpotData {
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  titles: string[];
  description: string;
  type: "Movie" | "Series" | "Book";
  image?: string;
  city: string;
  citySlug: string;
  country: string;
  flag: string;
  funFacts?: string[];
  visitTips?: string[];
  address?: string;
}

export interface CityFilmingData {
  name: string;
  country: string;
  flag: string;
  coords: [number, number];
  spots: FilmingSpotData[];
}

const romeSpotsRaw: Omit<FilmingSpotData, "city" | "citySlug" | "country" | "flag">[] = [
  { id: 1, slug: "the-colosseum", name: "The Colosseum", lat: 41.8902, lng: 12.4922, titles: ["Gladiator", "Roman Holiday"], type: "Movie", description: "The iconic amphitheatre featured in countless films, most notably the climactic arena scenes in Gladiator.", address: "Piazza del Colosseo, 1, 00184 Roma RM, Italy", funFacts: ["The Colosseum could hold between 50,000 and 80,000 spectators.", "Ridley Scott recreated the arena digitally for Gladiator — only 1/3 was a physical set.", "It's one of the New Seven Wonders of the World."], visitTips: ["Visit early morning (8:30 AM) to avoid crowds.", "Book skip-the-line tickets online.", "The underground tour reveals the original staging areas."] },
  { id: 2, slug: "trevi-fountain", name: "Trevi Fountain", lat: 41.9009, lng: 12.4833, titles: ["Roman Holiday", "To Rome with Love", "La Dolce Vita"], type: "Movie", description: "Made famous by Anita Ekberg's midnight dip in La Dolce Vita and the coin-tossing scene in Roman Holiday.", address: "Piazza di Trevi, 00187 Roma RM, Italy", funFacts: ["An estimated €3,000 is thrown into the fountain daily.", "The fountain was completed in 1762 and took 30 years to build.", "Federico Fellini's iconic La Dolce Vita scene was filmed at night over seven days."], visitTips: ["Visit between 7–9 AM for photos without crowds.", "Toss a coin with your right hand over your left shoulder.", "The area is beautifully lit at night."] },
  { id: 3, slug: "pantheon", name: "Pantheon", lat: 41.8986, lng: 12.4769, titles: ["Angels & Demons"], type: "Movie", description: "The ancient temple plays a pivotal role in Angels & Demons as a key clue in the Illuminati mystery.", address: "Piazza della Rotonda, 00186 Roma RM, Italy", funFacts: ["The Pantheon's dome is still the world's largest unreinforced concrete dome.", "The oculus (hole in the roof) is 8.2 metres in diameter.", "It has been in continuous use for 2,000 years."], visitTips: ["Entry is free but requires a reservation.", "Visit when it rains to see water fall through the oculus.", "Audio guides are available at the entrance."] },
  { id: 4, slug: "villa-borghese", name: "Villa Borghese", lat: 41.9142, lng: 12.4921, titles: ["The Great Beauty"], type: "Movie", description: "The beautiful gardens serve as the backdrop for Jep Gambardella's reflections on Rome.", address: "Piazzale Napoleone I, 00197 Roma RM, Italy", funFacts: ["The park covers 80 hectares — Rome's third-largest public park.", "It contains a zoo, several museums, and a lake with rowing boats.", "The Borghese Gallery inside houses works by Bernini and Caravaggio."], visitTips: ["Rent a bike or golf cart to cover the vast grounds.", "Book Borghese Gallery tickets well in advance.", "The Pincio terrace offers stunning sunset views over Piazza del Popolo."] },
  { id: 5, slug: "spanish-steps", name: "Spanish Steps", lat: 41.9060, lng: 12.4828, titles: ["Roman Holiday"], type: "Movie", description: "Where Audrey Hepburn's princess enjoys gelato in one of cinema's most beloved scenes.", address: "Piazza di Spagna, 00187 Roma RM, Italy", funFacts: ["The 135 steps were built in 1723–1725.", "Sitting on the steps is now prohibited and can result in a fine.", "The Keats-Shelley Memorial House is at the base of the steps."], visitTips: ["Visit at sunrise for the best photos.", "Explore the luxury shopping along Via dei Condotti nearby.", "The Trinità dei Monti church at the top offers great views."] },
  { id: 6, slug: "vatican-city", name: "Vatican City", lat: 41.9029, lng: 12.4534, titles: ["Angels & Demons"], type: "Movie", description: "St. Peter's Basilica and the Vatican Archives feature heavily in Dan Brown's thriller adaptation.", address: "Vatican City", funFacts: ["Vatican City is the smallest independent state in the world at 44 hectares.", "The Sistine Chapel ceiling took Michelangelo 4 years to paint.", "The Vatican Secret Archives contain over 85 km of shelving."], visitTips: ["Book Vatican Museums tickets online to skip 3+ hour queues.", "Dress code is enforced — cover shoulders and knees.", "Friday evenings are the least crowded time to visit."] },
  { id: 7, slug: "piazza-navona", name: "Piazza Navona", lat: 41.8992, lng: 12.4731, titles: ["Roman Holiday", "To Rome with Love"], type: "Movie", description: "This baroque masterpiece has served as a romantic backdrop in numerous Italian and Hollywood films.", address: "Piazza Navona, 00186 Roma RM, Italy", funFacts: ["The piazza was built on the site of the Stadium of Domitian (1st century AD).", "Bernini's Fountain of the Four Rivers dominates the center.", "The Christmas market here runs from late November through January 6."], visitTips: ["Have coffee at one of the cafés but expect tourist prices.", "Visit in the evening when street performers are active.", "Check out the underground ruins of the Stadium of Domitian nearby."] },
];

const parisSpotsRaw: Omit<FilmingSpotData, "city" | "citySlug" | "country" | "flag">[] = [
  { id: 1, slug: "eiffel-tower", name: "Eiffel Tower", lat: 48.8584, lng: 2.2945, titles: ["Midnight in Paris", "A View to a Kill"], type: "Movie", description: "Perhaps the most filmed landmark in the world, the Iron Lady stars in countless productions.", address: "Champ de Mars, 5 Av. Anatole France, 75007 Paris, France", funFacts: ["The tower was meant to be temporary, built for the 1889 World's Fair.", "It was the tallest man-made structure for 41 years.", "The tower grows about 6 inches in summer due to thermal expansion."], visitTips: ["Book tickets online at least 2 months in advance.", "Visit at sunset for golden-hour photos.", "The second floor restaurant offers a unique dining experience."] },
  { id: 2, slug: "pont-des-arts", name: "Pont des Arts", lat: 48.8583, lng: 2.3376, titles: ["Midnight in Paris"], type: "Movie", description: "The romantic bridge where Gil Pender wanders through Paris in Woody Allen's love letter to the city.", address: "Pont des Arts, 75006 Paris, France", funFacts: ["The original love locks were removed in 2015 — they weighed 45 tonnes.", "The current bridge is actually the third version, rebuilt in 1984.", "It connects the Institut de France with the Louvre."], visitTips: ["Walk across at golden hour for stunning Seine views.", "Bring a sketchbook — many artists set up here.", "Combine with a visit to the nearby Louvre."] },
  { id: 3, slug: "sacre-coeur", name: "Sacré-Cœur", lat: 48.8867, lng: 2.3431, titles: ["Amélie"], type: "Movie", description: "The hilltop basilica overlooks Montmartre, Amélie Poulain's whimsical neighbourhood.", address: "35 Rue du Chevalier de la Barre, 75018 Paris, France", funFacts: ["Construction began in 1875 and wasn't completed until 1914.", "The basilica's travertine stone secretes calcite when it rains, keeping it white.", "The bell, La Savoyarde, weighs 19 tonnes."], visitTips: ["Take the funicular to avoid the steep climb.", "The dome offers 360° views of Paris (300 steps up).", "Explore the artist-filled Place du Tertre nearby."] },
  { id: 4, slug: "cafe-des-2-moulins", name: "Café des 2 Moulins", lat: 48.8845, lng: 2.3338, titles: ["Amélie"], type: "Movie", description: "The real café where Amélie works as a waitress, still operating and welcoming fans.", address: "15 Rue Lepic, 75018 Paris, France", funFacts: ["The café kept its original décor after the film's success.", "They serve a crème brûlée named after Amélie.", "Jean-Pierre Jeunet chose this café for its authentic Montmartre charm."], visitTips: ["Go for breakfast to avoid the lunch rush.", "Try the Amélie crème brûlée.", "The nearby Moulin Rouge is a 5-minute walk."] },
  { id: 5, slug: "louvre-museum", name: "Louvre Museum", lat: 48.8606, lng: 2.3376, titles: ["The Da Vinci Code", "Wonder Woman"], type: "Movie", description: "From Da Vinci Code's opening murder to Wonder Woman's Diana Prince working among masterpieces.", address: "Rue de Rivoli, 75001 Paris, France", funFacts: ["The Louvre is the world's largest art museum with 380,000 objects.", "The glass pyramid was designed by I.M. Pei and opened in 1989.", "It would take 100 days to see every piece for 30 seconds each."], visitTips: ["Enter via the underground Carrousel du Louvre to skip the pyramid queue.", "Visit on Wednesday or Friday evenings when it's open late.", "Focus on one wing per visit to avoid exhaustion."] },
  { id: 6, slug: "notre-dame", name: "Notre-Dame", lat: 48.8530, lng: 2.3499, titles: ["The Hunchback of Notre Dame", "Before Sunset"], type: "Movie", description: "The gothic cathedral has inspired stories for centuries, from Victor Hugo to animated classics.", address: "6 Parvis Notre-Dame - Pl. Jean-Paul II, 75004 Paris, France", funFacts: ["Construction began in 1163 and took nearly 200 years.", "The 2019 fire destroyed the spire but the structure survived.", "Victor Hugo's 1831 novel helped save the cathedral from demolition."], visitTips: ["The cathedral reopened in December 2024 after restoration.", "The nearby Shakespeare & Company bookshop is a must-visit.", "Walk along the Seine afterwards for beautiful views."] },
];

const londonSpotsRaw: Omit<FilmingSpotData, "city" | "citySlug" | "country" | "flag">[] = [
  { id: 1, slug: "baker-street", name: "Baker Street", lat: 51.5238, lng: -0.1585, titles: ["Sherlock"], type: "Series", description: "221B Baker Street, the iconic address of the world's most famous consulting detective.", address: "221B Baker St, London NW1 6XE, UK", funFacts: ["The Sherlock Holmes Museum is actually located between 237 and 241 Baker Street.", "The BBC's Sherlock used 187 North Gower Street for exterior shots.", "Arthur Conan Doyle chose Baker Street because it was an ordinary, middle-class area."], visitTips: ["Visit the Sherlock Holmes Museum for a faithful recreation of 221B.", "The nearby Regent's Park is perfect for a walk after.", "Take the Tube to Baker Street station — the tiles feature Holmes's silhouette."] },
  { id: 2, slug: "greenwich", name: "Greenwich", lat: 51.4769, lng: -0.0005, titles: ["Sherlock", "Thor: The Dark World"], type: "Series", description: "The Old Royal Naval College has doubled for countless locations in film and television.", address: "Old Royal Naval College, Greenwich, London SE10 9NN, UK", funFacts: ["Greenwich is home to the Prime Meridian — 0° longitude.", "The Painted Hall took 19 years to complete and is called 'Britain's Sistine Chapel'.", "The site has appeared in over 100 films and TV shows."], visitTips: ["The Painted Hall is stunning and costs just £12.", "Take the Thames Clipper boat for a scenic journey.", "Combine with a visit to the Royal Observatory."] },
  { id: 3, slug: "kings-cross-station", name: "King's Cross Station", lat: 51.5320, lng: -0.1240, titles: ["Harry Potter"], type: "Movie", description: "Home of Platform 9¾, the magical gateway to Hogwarts Express.", address: "Euston Rd, London N1C 4QP, UK", funFacts: ["The Platform 9¾ photo opportunity features a trolley 'disappearing' into the wall.", "The Harry Potter Shop at Platform 9¾ is right next to the photo spot.", "The station's new departure hall was designed by John McAslan."], visitTips: ["Queue early for the Platform 9¾ photo — staff provide scarves and wands.", "The Harry Potter Shop has exclusive merchandise.", "St Pancras station next door is architecturally stunning."] },
  { id: 4, slug: "millennium-bridge", name: "Millennium Bridge", lat: 51.5095, lng: -0.0985, titles: ["Harry Potter"], type: "Movie", description: "Dramatically destroyed by Death Eaters in Harry Potter and the Half-Blood Prince.", address: "Thames Embankment, London SE1 9JE, UK", funFacts: ["The bridge famously wobbled when it opened in 2000, earning the name 'Wobbly Bridge'.", "It was closed for two years for modifications.", "The bridge offers a perfect view of St Paul's Cathedral."], visitTips: ["Walk from the Tate Modern on one end to St Paul's on the other.", "Visit at dusk when the bridge is beautifully lit.", "Combine with a visit to Shakespeare's Globe nearby."] },
  { id: 5, slug: "tower-bridge", name: "Tower Bridge", lat: 51.5055, lng: -0.0754, titles: ["Bridget Jones's Diary", "Spider-Man: Far From Home"], type: "Movie", description: "London's most recognizable bridge, featured in action sequences and romantic finales alike.", address: "Tower Bridge Rd, London SE1 2UP, UK", funFacts: ["The bridge took 8 years to build and was completed in 1894.", "The glass walkway 42 metres above the Thames offers incredible views.", "The bridge lifts around 800 times per year."], visitTips: ["Check the bridge lift schedule online before visiting.", "The Tower Bridge Exhibition includes the glass floor walkway.", "The nearby Tower of London is a must-see."] },
];

function enrichSpots(spots: Omit<FilmingSpotData, "city" | "citySlug" | "country" | "flag">[], city: string, citySlug: string, country: string, flag: string): FilmingSpotData[] {
  return spots.map((s) => ({ ...s, city, citySlug, country, flag }));
}

export const allFilmingSpots: FilmingSpotData[] = [
  ...enrichSpots(romeSpotsRaw, "Rome", "rome", "Italy", "🇮🇹"),
  ...enrichSpots(parisSpotsRaw, "Paris", "paris", "France", "🇫🇷"),
  ...enrichSpots(londonSpotsRaw, "London", "london", "United Kingdom", "🇬🇧"),
];

export const citiesFilmingData: Record<string, CityFilmingData> = {
  rome: {
    name: "Rome",
    country: "Italy",
    flag: "🇮🇹",
    coords: [41.9028, 12.4964],
    spots: enrichSpots(romeSpotsRaw, "Rome", "rome", "Italy", "🇮🇹"),
  },
  paris: {
    name: "Paris",
    country: "France",
    flag: "🇫🇷",
    coords: [48.8566, 2.3522],
    spots: enrichSpots(parisSpotsRaw, "Paris", "paris", "France", "🇫🇷"),
  },
  london: {
    name: "London",
    country: "United Kingdom",
    flag: "🇬🇧",
    coords: [51.5074, -0.1278],
    spots: enrichSpots(londonSpotsRaw, "London", "london", "United Kingdom", "🇬🇧"),
  },
};

export function getSpotBySlug(slug: string): FilmingSpotData | undefined {
  return allFilmingSpots.find((s) => s.slug === slug);
}

export function getSpotsByCity(citySlug: string): FilmingSpotData[] {
  return allFilmingSpots.filter((s) => s.citySlug === citySlug);
}
