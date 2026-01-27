// BTME (Beyond the Map's Edge) Treasure Hunt Rules
// Compiled from the JIBLE 5.0 - Justin Posey's statements

export interface BTMERule {
  id: string;
  category: 'location' | 'access' | 'safety' | 'elimination';
  rule: string;
  source: string;
  date: string;
  confidence: 'confirmed' | 'likely' | 'uncertain';
}

export const BTME_RULES: BTMERule[] = [
  // LOCATION RULES
  {
    id: 'public-land',
    category: 'location',
    rule: 'On publicly accessible land anyone can visit',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'not-private',
    category: 'location',
    rule: 'NOT on private property',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'on-map',
    category: 'location',
    rule: 'Hidden somewhere on the published BTME map',
    source: 'Treasure Hunt with Us interview',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'western-us',
    category: 'location',
    rule: 'Located in the western United States',
    source: 'BTME website, Legal page',
    date: '03/27/25',
    confidence: 'confirmed',
  },
  {
    id: 'elevation',
    category: 'location',
    rule: 'Below 11,000 feet elevation (potential future restriction)',
    source: 'X Dark Matters interview',
    date: '09/04/25',
    confidence: 'likely',
  },
  {
    id: 'not-near-trail',
    category: 'location',
    rule: 'Not in very close proximity to any man-made trail',
    source: 'Dillon Q&A',
    date: '06/21/25',
    confidence: 'confirmed',
  },
  {
    id: 'mile-from-posey',
    category: 'location',
    rule: 'More than 1 mile from anywhere Justin Posey, family, or friends live, work, or own property',
    source: 'BTME website Rules page',
    date: '07/18/25',
    confidence: 'confirmed',
  },

  // ELIMINATION RULES
  {
    id: 'no-buildings',
    category: 'elimination',
    rule: 'NOT associated with any man-made buildings',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'no-caves',
    category: 'elimination',
    rule: 'NOT in caves, mines, or tunnels',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'no-graves',
    category: 'elimination',
    rule: 'NOT near graves or grave markers',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'no-dangerous',
    category: 'elimination',
    rule: 'NOT in dangerous places',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'not-underwater',
    category: 'elimination',
    rule: 'NOT underwater',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },

  // ACCESS RULES
  {
    id: 'low-clearance',
    category: 'access',
    rule: 'Accessible by low-clearance vehicle (Prius can make it)',
    source: 'Sandal Sanders TikTok',
    date: '09/27/25',
    confidence: 'confirmed',
  },
  {
    id: 'hike-distance',
    category: 'access',
    rule: 'Less than 1 mile hike to figure out where treasure is',
    source: 'Cowlazar & Kpro 2025 interview',
    date: '03/31/25',
    confidence: 'confirmed',
  },
  {
    id: '24-7-access',
    category: 'access',
    rule: '24/7 accessible (as of March 2025)',
    source: 'Cowlazar & Kpro 2025 interview',
    date: '03/31/25',
    confidence: 'confirmed',
  },
  {
    id: 'no-fee',
    category: 'access',
    rule: 'No fee required to enter (as of Netflix launch)',
    source: 'Cowlazar & Kpro 2025 interview',
    date: '03/31/25',
    confidence: 'likely',
  },
  {
    id: 'no-permission',
    category: 'access',
    rule: 'No permission needed to enter (not private land)',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'dog-friendly',
    category: 'access',
    rule: 'Dogs allowed if outdoors type',
    source: 'BTME Announcements',
    date: '03/31/25',
    confidence: 'confirmed',
  },

  // SAFETY RULES
  {
    id: 'no-swimming',
    category: 'safety',
    rule: 'No swimming skills required',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'no-climbing',
    category: 'safety',
    rule: 'No ladders or climbing skills required',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'safe-location',
    category: 'safety',
    rule: 'All hunt items are safe to get to',
    source: 'BTME website, Rules page',
    date: '04/09/25',
    confidence: 'confirmed',
  },
  {
    id: 'no-snow-search',
    category: 'safety',
    rule: 'Avoid searching in snow - you won\'t have luck',
    source: 'Cowlazar & Kpro 2025 interview',
    date: '03/31/25',
    confidence: 'confirmed',
  },
];

// Land types that are valid for searching (publicly accessible)
export const VALID_LAND_TYPES = [
  'National Park',
  'National Forest',
  'Wilderness Area',
  'BLM Land',
  'State Trust Land',
  'State Park',
  'National Monument',
  'National Recreation Area',
  'Wildlife Refuge',
] as const;

// Land types mentioned as having "stable ownership" (preferred by Justin for hiding)
export const STABLE_LAND_TYPES = [
  'National Park',
  'Wilderness Area',
] as const;

// States covered by the BTME map (Western US)
export const BTME_STATES = [
  'Montana',
  'Wyoming',
  'Idaho',
  'Colorado',
  'Utah',
  'Nevada',
  'New Mexico',
  'Arizona',
  // Note: California, Oregon, Washington may or may not be on the map
  // Justin hasn't eliminated any states yet
] as const;

// Key poem clues for reference
export const POEM_CLUES = [
  { line: 'As hope surges clear and bright', note: 'First actionable clue (confirmed by Justin)' },
  { line: 'In ursa east his realm awaits', note: 'Intentionally not capitalized' },
  { line: 'Double arcs on granite bold', note: 'Over-emphasis may not be justified per Justin' },
  { line: 'Return her face to find the place', note: '"Her face" not far from "the place"' },
  { line: 'Round the bend, then past the hole', note: 'Walking distance from "waters\' silent flight"' },
  { line: 'The bride', note: 'Not a living person, unclear if ever "alive"' },
];

// Progress notes from JIBLE
export const SEARCH_PROGRESS = {
  firstStanza: 'Largely solved by searchers',
  secondStanza: 'At least half solved',
  checkpoint: 'Some within 200 feet, but not found',
  doubleArcs: 'No one has figured out yet (as of 09/04/25)',
  cipher: 'Not solved yet - nod to container, basic math only',
  technicalClue: 'SOLVED - Ultrasonic message in ARKADE song',
};
