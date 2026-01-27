import type { FeatureCollection, Feature } from 'geojson';
import { addFeatureIds } from './dataLoader';

// BTME-specific data sources
const BTME_DATA_SOURCES = {
  // US States (for western US boundary)
  states: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',

  // National Park Service - Park boundaries
  nationalParks: 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/NPS_Land_Resources_Division_Boundary_and_Tract_Data_Service/FeatureServer/2/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=500',

  // Wilderness Areas (USFS)
  wilderness: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Wilderness_Areas/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=1000',

  // Protected Areas Database (includes multiple types)
  protectedAreas: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Protected_Areas/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=2000',
};

// Western US state codes for filtering
const WESTERN_STATE_CODES = ['MT', 'WY', 'ID', 'CO', 'UT', 'NV', 'NM', 'AZ', 'CA', 'OR', 'WA'];
const WESTERN_STATE_NAMES = [
  'Montana', 'Wyoming', 'Idaho', 'Colorado', 'Utah', 'Nevada',
  'New Mexico', 'Arizona', 'California', 'Oregon', 'Washington'
];

// BTME map bounds (approximate based on typical western US treasure hunt maps)
export const BTME_MAP_BOUNDS = {
  north: 49.0,  // Canadian border
  south: 31.0,  // Southern NM/AZ
  east: -102.0, // Eastern CO/WY/MT
  west: -125.0, // Pacific coast
};

// Check if a feature is within BTME bounds
const isInBTMEBounds = (feature: Feature): boolean => {
  try {
    const coords = JSON.stringify(feature.geometry);
    // Simple check - if any coordinate is in western US range
    // This is approximate; a proper implementation would use turf.js
    const hasWesternCoords = coords.includes('-1') && // Has negative longitude
      (coords.includes('3') || coords.includes('4')); // Has latitude in 30s-40s
    return hasWesternCoords;
  } catch {
    return true; // Include if we can't determine
  }
};

// Filter to western US states
const filterToWestern = (data: FeatureCollection): FeatureCollection => {
  return {
    type: 'FeatureCollection',
    features: data.features.filter((feature) => {
      const props = feature.properties || {};

      // Check by state code
      const stateCode = props.STATE || props.STUSPS || props.state ||
                       props.STATE_ABBR || props.STATEABBR || props.State_Code;
      if (stateCode && WESTERN_STATE_CODES.includes(stateCode)) return true;

      // Check by state name
      const stateName = props.NAME || props.name || props.STATE_NAME || props.State_Name;
      if (stateName && WESTERN_STATE_NAMES.includes(stateName)) return true;

      // For features without state info, check bounds
      return isInBTMEBounds(feature);
    }),
  };
};

// Load Western US states
export const loadBTMEStates = async (): Promise<FeatureCollection> => {
  const response = await fetch(BTME_DATA_SOURCES.states);
  if (!response.ok) throw new Error('Failed to load state boundaries');

  const data = await response.json();
  const western = filterToWestern(data);
  return addFeatureIds(western, 'state');
};

// Load National Parks in Western US
export const loadNationalParks = async (): Promise<FeatureCollection> => {
  try {
    const response = await fetch(BTME_DATA_SOURCES.nationalParks);
    if (!response.ok) throw new Error('Failed to load national parks');

    const data = await response.json();

    // Add land type and filter to western
    const processed: FeatureCollection = {
      type: 'FeatureCollection',
      features: data.features.map((f: Feature) => ({
        ...f,
        properties: {
          ...f.properties,
          landType: 'National Park',
          isStableLand: true, // Per Justin's comments
        },
      })),
    };

    const western = filterToWestern(processed);
    return addFeatureIds(western, 'national_park');
  } catch (error) {
    console.error('Error loading national parks:', error);
    // Return empty collection on error
    return { type: 'FeatureCollection', features: [] };
  }
};

// Load Wilderness Areas
export const loadWildernessAreas = async (): Promise<FeatureCollection> => {
  try {
    const response = await fetch(BTME_DATA_SOURCES.wilderness);
    if (!response.ok) throw new Error('Failed to load wilderness areas');

    const data = await response.json();

    // Add land type
    const processed: FeatureCollection = {
      type: 'FeatureCollection',
      features: data.features.map((f: Feature) => ({
        ...f,
        properties: {
          ...f.properties,
          landType: 'Wilderness Area',
          isStableLand: true, // Per Justin's comments - "gold standard of conservation"
        },
      })),
    };

    const western = filterToWestern(processed);
    return addFeatureIds(western, 'wilderness');
  } catch (error) {
    console.error('Error loading wilderness areas:', error);
    return { type: 'FeatureCollection', features: [] };
  }
};

// Load all protected areas (BLM, USFS, State, etc.)
export const loadProtectedAreas = async (): Promise<FeatureCollection> => {
  try {
    const response = await fetch(BTME_DATA_SOURCES.protectedAreas);
    if (!response.ok) throw new Error('Failed to load protected areas');

    const data = await response.json();

    // Categorize by management type
    const processed: FeatureCollection = {
      type: 'FeatureCollection',
      features: data.features.map((f: Feature) => {
        const props = f.properties || {};
        const manager = props.Mang_Name || props.Manager || '';
        const designation = props.Des_Tp || props.Designation || '';

        let landType = 'Protected Area';
        let isStableLand = false;

        if (manager.includes('BLM') || manager.includes('Bureau of Land Management')) {
          landType = 'BLM Land';
        } else if (manager.includes('Forest Service') || manager.includes('USFS')) {
          landType = 'National Forest';
        } else if (manager.includes('State')) {
          landType = 'State Land';
        } else if (designation.includes('Wilderness')) {
          landType = 'Wilderness Area';
          isStableLand = true;
        } else if (designation.includes('National Park')) {
          landType = 'National Park';
          isStableLand = true;
        }

        return {
          ...f,
          properties: {
            ...props,
            landType,
            isStableLand,
          },
        };
      }),
    };

    const western = filterToWestern(processed);
    return addFeatureIds(western, 'protected_area');
  } catch (error) {
    console.error('Error loading protected areas:', error);
    return { type: 'FeatureCollection', features: [] };
  }
};

// Generate sample search grid for BTME area
// This creates a grid of small areas that can be marked as searched/eliminated
export const generateSearchGrid = (
  cellSizeDegrees: number = 0.1 // ~7 miles at this latitude
): FeatureCollection => {
  const features: Feature[] = [];
  let id = 0;

  for (let lat = BTME_MAP_BOUNDS.south; lat < BTME_MAP_BOUNDS.north; lat += cellSizeDegrees) {
    for (let lng = BTME_MAP_BOUNDS.west; lng < BTME_MAP_BOUNDS.east; lng += cellSizeDegrees) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng, lat],
            [lng + cellSizeDegrees, lat],
            [lng + cellSizeDegrees, lat + cellSizeDegrees],
            [lng, lat + cellSizeDegrees],
            [lng, lat],
          ]],
        },
        properties: {
          _featureId: `grid_${id}`,
          gridId: id,
          centerLat: lat + cellSizeDegrees / 2,
          centerLng: lng + cellSizeDegrees / 2,
          searched: false,
          eliminated: false,
          notes: '',
        },
      });
      id++;
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
};

// Quick data validation
export const validateBTMELocation = (lat: number, lng: number): {
  valid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  if (lat < BTME_MAP_BOUNDS.south || lat > BTME_MAP_BOUNDS.north) {
    issues.push('Outside BTME map latitude bounds');
  }
  if (lng < BTME_MAP_BOUNDS.west || lng > BTME_MAP_BOUNDS.east) {
    issues.push('Outside BTME map longitude bounds');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
