import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export interface LayerStyle {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
}

export interface FilterRule {
  id: string;
  property: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in';
  value: string | number | [number, number] | string[];
  enabled: boolean;
}

export interface ColorRule {
  id: string;
  name: string;
  property: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in';
  value: string | number | [number, number] | string[];
  color: string;
  enabled: boolean;
}

export type LayerType =
  | 'state'
  | 'county'
  | 'national_park'
  | 'national_monument'
  | 'national_forest'
  | 'wilderness'
  | 'state_park'
  | 'recreation_area'
  | 'conservation_area'
  | 'trail'
  | 'trailhead'
  | 'water_feature'
  | 'place_name'
  | 'custom';

// Poem clue categories for place name searches
export type PoemClueCategory = 'bear' | 'bride' | 'granite' | 'water' | 'arch' | 'face' | 'hole';

export interface GeoLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  data: FeatureCollection | null;
  loading: boolean;
  error: string | null;
  style: LayerStyle;
  filters: FilterRule[];
  colorRules: ColorRule[];
  selectedFeatures: Set<string>;
  opacity: number;
  zIndex: number;
}

export interface MapState {
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]] | null;
}

export interface SelectionGroup {
  id: string;
  name: string;
  color: string;
  featureIds: Set<string>;
  layerIds: string[];
}

export interface AppState {
  layers: GeoLayer[];
  mapState: MapState;
  selectionGroups: SelectionGroup[];
  activeSelectionGroupId: string | null;
  isDrawingMode: boolean;
  searchQuery: string;
}

// BTME Hunt-specific types
export interface BTMEFilters {
  maxElevation: number | null;  // Filter areas above this elevation (feet)
  stableLandOnly: boolean;      // Only show National Parks & Wilderness
  showSearchedAreas: boolean;   // Show/hide areas marked as searched
  showEliminatedAreas: boolean; // Show/hide areas marked as eliminated
  clipToBTMEBounds: boolean;    // Only show within BTME map bounds
}

export interface SearchedArea {
  id: string;
  name: string;
  bounds: [[number, number], [number, number]]; // SW, NE corners
  status: 'searched' | 'eliminated' | 'interest';
  notes: string;
  dateAdded: string;
  color: string;
}

// BTME map bounds (from the official map)
export const BTME_MAP_BOUNDS = {
  // Continental Western US portion
  west: {
    north: 49.0,
    south: 31.0,
    east: -102.0,
    west: -125.0,
  },
  // Alaska portion
  alaska: {
    north: 72.0,
    south: 51.0,
    east: -129.0,
    west: -180.0,
  },
};

// Stable land types per Justin's statements
export const STABLE_LAND_TYPES: LayerType[] = ['national_park', 'wilderness'];

// Western US states for filtering
export const WESTERN_US_STATES = [
  'WA', 'OR', 'CA', 'ID', 'NV', 'MT', 'WY', 'UT', 'CO', 'AZ', 'NM',
  'AK', 'HI' // Include Alaska and Hawaii
] as const;

export const WESTERN_US_STATE_NAMES = [
  'Washington', 'Oregon', 'California', 'Idaho', 'Nevada',
  'Montana', 'Wyoming', 'Utah', 'Colorado', 'Arizona', 'New Mexico',
  'Alaska', 'Hawaii'
] as const;

// Bounding box for western US (excluding AK/HI for main view)
export const WESTERN_US_BOUNDS: [[number, number], [number, number]] = [
  [31.0, -125.0], // Southwest corner
  [49.0, -102.0]  // Northeast corner
];

export const WESTERN_US_CENTER: [number, number] = [40.0, -113.5];

export type FeatureWithId = Feature<Geometry, GeoJsonProperties & { _featureId: string }>;
