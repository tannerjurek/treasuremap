import type { Feature, FeatureCollection, Point } from 'geojson';
import * as turf from '@turf/turf';
import { searchPlaceNames } from './dataLoader';
import { FEE_PARKS } from '../components/GeometryToolsPanel';

// ============================================
// SOLVER TYPES
// ============================================

export interface ClueMatch {
  clueCategory: string;
  featureName: string;
  lat: number;
  lng: number;
  featureType: string;
  keyword: string;
}

export interface CandidateCluster {
  id: string;
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  matches: ClueMatch[];
  cluesCovered: Set<string>;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  label: string;
}

export interface ScoreBreakdown {
  clueDiversity: number;       // How many distinct clue categories matched (0-7)
  clueProximity: number;       // How close the clue matches are to each other
  constraintScore: number;     // How well it satisfies hard constraints
  celestialAlignment: number;  // Bonus for celestial/geometric alignment
  theoryBonus: number;         // Bonus for matching known theories
  total: number;
}

export interface SolverProgress {
  phase: string;
  detail: string;
  percent: number;
}

export type ProgressCallback = (progress: SolverProgress) => void;

// ============================================
// CONSTANTS
// ============================================

// All clue categories and their extended keywords for thorough searching
const SOLVER_KEYWORDS: Record<string, string[]> = {
  bear: ['Bear', 'Ursa', 'Grizzly', 'Kodiak', 'Cub'],
  bride: ['Bride', 'Wedding', 'Bridal', 'Veil', 'Chapel'],
  granite: ['Granite', 'Stone', 'Rock', 'Boulder', 'Ledge'],
  water: ['Falls', 'Waterfall', 'Spring', 'Creek', 'River', 'Lake'],
  arch: ['Arch', 'Arc', 'Double', 'Bridge', 'Natural Bridge'],
  face: ['Face', 'Head', 'Profile', 'Lookout', 'View', 'Overlook'],
  hole: ['Hole', 'Cave', 'Hollow', 'Gap', 'Gulch', 'Basin'],
};

// Additional keywords for the "wisdom" clue (line 10)
const WISDOM_KEYWORDS = ['Wisdom', 'Shadow', 'Shade', 'Owl'];

// Additional keywords for the "pole" clue (line 6)
const POLE_KEYWORDS = ['Pole', 'Polaris', 'North Star', 'Fish', 'Fishing', 'Angler'];

// Additional keywords for "hope/surge" (line 1)
const HOPE_KEYWORDS = ['Hope', 'Surge', 'Bright', 'Dawn'];

// Cluster radius in miles - how close features must be to form a cluster
const CLUSTER_RADIUS_MILES = 30;

// Known reference points
const SAFE_ANCHOR = { lat: 44.26, lng: -110.5 };
const POLARIS_MT = { lat: 45.4011, lng: -113.1338 };
const WISDOM_MT = { lat: 45.6183, lng: -113.4469 };

// ============================================
// SOLVER ENGINE
// ============================================

/**
 * Search GNIS for all clue keywords and return matched features tagged with clue info
 */
async function searchAllClues(onProgress: ProgressCallback): Promise<ClueMatch[]> {
  const allMatches: ClueMatch[] = [];

  // Combine all keyword groups
  const searchGroups: [string, string[]][] = [
    ...Object.entries(SOLVER_KEYWORDS),
    ['wisdom', WISDOM_KEYWORDS],
    ['pole', POLE_KEYWORDS],
    ['hope', HOPE_KEYWORDS],
  ];

  const total = searchGroups.length;

  for (let i = 0; i < searchGroups.length; i++) {
    const [category, keywords] = searchGroups[i];
    onProgress({
      phase: 'Searching',
      detail: `Searching "${category}" keywords (${keywords.join(', ')})...`,
      percent: Math.round((i / total) * 40),
    });

    try {
      const results = await searchPlaceNames(keywords);
      if (results.features) {
        for (const feature of results.features) {
          if (feature.geometry.type !== 'Point') continue;
          const coords = (feature.geometry as Point).coordinates;
          const name = feature.properties?.GNIS_NAME || feature.properties?.NAME || 'Unknown';
          const featureType = feature.properties?.FEATURE_CLASS || feature.properties?.TYPE || '';

          // Find which keyword matched
          const matchedKeyword = keywords.find(k =>
            name.toLowerCase().includes(k.toLowerCase())
          ) || keywords[0];

          allMatches.push({
            clueCategory: category,
            featureName: name,
            lat: coords[1],
            lng: coords[0],
            featureType,
            keyword: matchedKeyword,
          });
        }
      }
    } catch (error) {
      console.warn(`Solver: failed to search "${category}":`, error);
    }
  }

  return allMatches;
}

/**
 * Group matches into geographic clusters using a grid-based approach
 */
function clusterMatches(
  matches: ClueMatch[],
  radiusMiles: number,
  onProgress: ProgressCallback
): CandidateCluster[] {
  onProgress({
    phase: 'Clustering',
    detail: 'Grouping nearby features...',
    percent: 45,
  });

  if (matches.length === 0) return [];

  // Use grid-based clustering: divide the western US into cells
  const cellSizeDeg = radiusMiles / 69; // rough miles-to-degrees conversion
  const grid: Map<string, ClueMatch[]> = new Map();

  for (const match of matches) {
    const cellX = Math.floor(match.lng / cellSizeDeg);
    const cellY = Math.floor(match.lat / cellSizeDeg);
    const key = `${cellX},${cellY}`;

    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(match);
  }

  onProgress({
    phase: 'Clustering',
    detail: `Found ${grid.size} grid cells with matches`,
    percent: 50,
  });

  // Build clusters from grid cells, merging adjacent cells
  const clusters: CandidateCluster[] = [];
  let clusterId = 0;

  for (const [, cellMatches] of grid) {
    // Only keep cells with matches from at least 2 different clue categories
    const categories = new Set(cellMatches.map(m => m.clueCategory));
    if (categories.size < 2) continue;

    // Calculate center
    const avgLat = cellMatches.reduce((s, m) => s + m.lat, 0) / cellMatches.length;
    const avgLng = cellMatches.reduce((s, m) => s + m.lng, 0) / cellMatches.length;

    // Calculate radius (max distance from center)
    let maxDist = 0;
    for (const m of cellMatches) {
      const d = turf.distance(
        turf.point([avgLng, avgLat]),
        turf.point([m.lng, m.lat]),
        { units: 'miles' }
      );
      if (d > maxDist) maxDist = d;
    }

    clusters.push({
      id: `cluster_${clusterId++}`,
      centerLat: avgLat,
      centerLng: avgLng,
      radiusMiles: Math.max(maxDist, 1),
      matches: cellMatches,
      cluesCovered: categories,
      score: 0,
      scoreBreakdown: {
        clueDiversity: 0,
        clueProximity: 0,
        constraintScore: 0,
        celestialAlignment: 0,
        theoryBonus: 0,
        total: 0,
      },
      label: '',
    });
  }

  // Also expand clusters by pulling in nearby features from single-category cells
  for (const cluster of clusters) {
    for (const [, cellMatches] of grid) {
      for (const match of cellMatches) {
        if (cluster.matches.includes(match)) continue;
        const dist = turf.distance(
          turf.point([cluster.centerLng, cluster.centerLat]),
          turf.point([match.lng, match.lat]),
          { units: 'miles' }
        );
        if (dist <= radiusMiles) {
          cluster.matches.push(match);
          cluster.cluesCovered.add(match.clueCategory);
        }
      }
    }
  }

  return clusters;
}

/**
 * Score each cluster based on how well it satisfies the hunt constraints and clue matches
 */
function scoreClusters(
  clusters: CandidateCluster[],
  onProgress: ProgressCallback
): CandidateCluster[] {
  onProgress({
    phase: 'Scoring',
    detail: 'Evaluating candidate areas...',
    percent: 65,
  });

  const allCategories = [
    'bear', 'bride', 'granite', 'water', 'arch', 'face', 'hole',
    'wisdom', 'pole', 'hope',
  ];

  for (const cluster of clusters) {
    const bd: ScoreBreakdown = {
      clueDiversity: 0,
      clueProximity: 0,
      constraintScore: 0,
      celestialAlignment: 0,
      theoryBonus: 0,
      total: 0,
    };

    // 1. Clue diversity score (0-100): more distinct clue categories = better
    const diversityRatio = cluster.cluesCovered.size / allCategories.length;
    bd.clueDiversity = Math.round(diversityRatio * 100);

    // 2. Clue proximity score (0-100): tighter clusters = better
    if (cluster.matches.length >= 2) {
      // Average pairwise distance between matches
      let totalDist = 0;
      let pairs = 0;
      for (let i = 0; i < cluster.matches.length; i++) {
        for (let j = i + 1; j < cluster.matches.length; j++) {
          totalDist += turf.distance(
            turf.point([cluster.matches[i].lng, cluster.matches[i].lat]),
            turf.point([cluster.matches[j].lng, cluster.matches[j].lat]),
            { units: 'miles' }
          );
          pairs++;
        }
      }
      const avgDist = totalDist / pairs;
      // Score: 100 if within 1 mile, drops to 0 at 50+ miles
      bd.clueProximity = Math.max(0, Math.round(100 * (1 - avgDist / 50)));
    }

    // 3. Constraint score (0-100)
    let constraints = 0;
    const center = turf.point([cluster.centerLng, cluster.centerLat]);

    // Is it in western US? (rough bounding box check)
    if (cluster.centerLng >= -125 && cluster.centerLng <= -102 &&
        cluster.centerLat >= 31 && cluster.centerLat <= 49) {
      constraints += 20;
    }

    // Is it away from Polaris, MT? (>1 mile)
    const polarisDistance = turf.distance(
      center,
      turf.point([POLARIS_MT.lng, POLARIS_MT.lat]),
      { units: 'miles' }
    );
    if (polarisDistance > 1) constraints += 20;

    // Elevation check - areas in known low-elevation corridors score higher
    // (We can't query elevation directly, but river valleys are typically lower)
    if (cluster.matches.some(m =>
      m.featureType.toLowerCase().includes('valley') ||
      m.featureType.toLowerCase().includes('stream') ||
      m.featureType.toLowerCase().includes('flat')
    )) {
      constraints += 15;
    } else {
      constraints += 10; // partial credit
    }

    // Not in a fee-entry park
    const inFeePark = FEE_PARKS.some(park => {
      return cluster.matches.some(m =>
        m.featureName.toLowerCase().includes(park.toLowerCase())
      );
    });
    if (!inFeePark) constraints += 20;
    else constraints += 5; // small credit since some areas near parks are fine

    // Has water features (needed for "waters' silent flight")
    if (cluster.matches.some(m => m.clueCategory === 'water')) {
      constraints += 20;
    }

    bd.constraintScore = constraints;

    // 4. Celestial alignment bonus (0-30)
    // Bonus for being along the Arcturus bearing from safe anchor
    const distFromAnchor = turf.distance(
      center,
      turf.point([SAFE_ANCHOR.lng, SAFE_ANCHOR.lat]),
      { units: 'miles' }
    );
    const bearingFromAnchor = turf.bearing(
      turf.point([SAFE_ANCHOR.lng, SAFE_ANCHOR.lat]),
      center
    );
    // "At the foot of three at twenty degree" - bonus for ~20 degree bearing from anchor
    if (Math.abs(bearingFromAnchor - 20) < 10 || Math.abs(bearingFromAnchor - 340) < 10) {
      bd.celestialAlignment += 15;
    }
    // Bonus for reasonable distance from anchor (50-300 miles)
    if (distFromAnchor >= 50 && distFromAnchor <= 300) {
      bd.celestialAlignment += 15;
    }

    // 5. Theory bonus (0-30)
    // Wisdom, MT area theory
    const distFromWisdom = turf.distance(
      center,
      turf.point([WISDOM_MT.lng, WISDOM_MT.lat]),
      { units: 'miles' }
    );
    if (distFromWisdom < 30) {
      bd.theoryBonus += 15;
    }

    // Big Hole Valley theory
    if (cluster.matches.some(m =>
      m.featureName.toLowerCase().includes('big hole') ||
      m.featureName.toLowerCase().includes('hole')
    )) {
      bd.theoryBonus += 10;
    }

    // Longitude ~113 theory (from book clue)
    if (Math.abs(cluster.centerLng - (-113)) < 1) {
      bd.theoryBonus += 5;
    }

    // Total score (weighted)
    bd.total = Math.round(
      bd.clueDiversity * 0.35 +
      bd.clueProximity * 0.20 +
      bd.constraintScore * 0.25 +
      bd.celestialAlignment * 0.10 +
      bd.theoryBonus * 0.10
    );

    cluster.score = bd.total;
    cluster.scoreBreakdown = bd;

    // Generate a label from the most distinctive match
    const bestMatch = cluster.matches.reduce((best, m) => {
      if (!best) return m;
      // Prefer features with distinctive names
      if (m.featureName.length > best.featureName.length) return m;
      return best;
    }, cluster.matches[0]);
    cluster.label = bestMatch?.featureName || `Area at ${cluster.centerLat.toFixed(2)}, ${cluster.centerLng.toFixed(2)}`;
  }

  // Sort by score descending
  clusters.sort((a, b) => b.score - a.score);

  return clusters;
}

/**
 * Build GeoJSON FeatureCollection from solver results for map display
 */
export function clustersToGeoJSON(clusters: CandidateCluster[], maxResults = 25): FeatureCollection {
  const features: Feature[] = [];
  const topClusters = clusters.slice(0, maxResults);

  for (let i = 0; i < topClusters.length; i++) {
    const cluster = topClusters[i];
    const rank = i + 1;

    // Add cluster center point
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [cluster.centerLng, cluster.centerLat],
      },
      properties: {
        _featureId: `solver_${cluster.id}`,
        name: `#${rank}: ${cluster.label}`,
        score: cluster.score,
        clueCount: cluster.cluesCovered.size,
        matchCount: cluster.matches.length,
        clues: Array.from(cluster.cluesCovered).join(', '),
        rank,
      },
    });

    // Add cluster radius circle
    const circle = turf.circle(
      [cluster.centerLng, cluster.centerLat],
      Math.min(cluster.radiusMiles, CLUSTER_RADIUS_MILES) * 1.60934,
      { steps: 32, units: 'kilometers' }
    );
    features.push({
      type: 'Feature',
      geometry: circle.geometry,
      properties: {
        _featureId: `solver_${cluster.id}_area`,
        name: `Area #${rank}`,
        score: cluster.score,
        rank,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Build GeoJSON for individual match points within a cluster
 */
export function clusterMatchesToGeoJSON(cluster: CandidateCluster): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cluster.matches.map((match, i) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [match.lng, match.lat],
      },
      properties: {
        _featureId: `match_${cluster.id}_${i}`,
        name: match.featureName,
        clue: match.clueCategory,
        keyword: match.keyword,
        featureType: match.featureType,
      },
    })),
  };
}

// ============================================
// MAIN SOLVER FUNCTION
// ============================================

export async function runSolver(
  onProgress: ProgressCallback
): Promise<CandidateCluster[]> {
  onProgress({ phase: 'Starting', detail: 'Initializing solver...', percent: 0 });

  // Step 1: Search all clue keywords via GNIS
  const matches = await searchAllClues(onProgress);
  onProgress({
    phase: 'Searching',
    detail: `Found ${matches.length} total place name matches`,
    percent: 40,
  });

  if (matches.length === 0) {
    onProgress({ phase: 'Done', detail: 'No matches found', percent: 100 });
    return [];
  }

  // Step 2: Cluster by proximity
  const clusters = clusterMatches(matches, CLUSTER_RADIUS_MILES, onProgress);
  onProgress({
    phase: 'Clustering',
    detail: `Identified ${clusters.length} candidate areas with 2+ clue types`,
    percent: 60,
  });

  // Step 3: Score and rank
  const scored = scoreClusters(clusters, onProgress);
  onProgress({
    phase: 'Done',
    detail: `Ranked ${scored.length} candidate areas`,
    percent: 100,
  });

  return scored;
}
