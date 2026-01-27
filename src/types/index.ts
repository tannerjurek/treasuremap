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
  | 'zipcode'
  | 'county'
  | 'state'
  | 'national_park'
  | 'national_forest'
  | 'blm_land'
  | 'census_tract'
  | 'tribal_land'
  | 'wilderness'
  | 'custom';

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
