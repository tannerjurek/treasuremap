import type { FeatureCollection, Feature } from 'geojson';
import { WESTERN_US_STATES } from '../types';

// Western US bounding box for spatial queries (includes Alaska inset area conceptually)
const WESTERN_BOUNDS = {
  xmin: -125,
  ymin: 31,
  xmax: -102,
  ymax: 49,
};

// Alaska bounds for separate queries
const ALASKA_BOUNDS = {
  xmin: -180,
  ymin: 51,
  xmax: -129,
  ymax: 72,
};

// Build ArcGIS query with spatial filter
const buildArcGISQuery = (baseUrl: string, bounds = WESTERN_BOUNDS, extraParams: string = '') => {
  const geometry = encodeURIComponent(JSON.stringify({
    xmin: bounds.xmin,
    ymin: bounds.ymin,
    xmax: bounds.xmax,
    ymax: bounds.ymax,
    spatialReference: { wkid: 4326 }
  }));
  return `${baseUrl}?where=1%3D1&outFields=*&f=geojson&geometry=${geometry}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects${extraParams}`;
};

// Public data sources for BTME map layers
const DATA_SOURCES = {
  // State boundaries
  states: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',

  // County boundaries
  counties: 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json',

  // NPS - National Parks, Monuments, Recreation Areas, etc.
  npsUnits: 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/NPS_Land_Resources_Division_Boundary_and_Tract_Data_Service/FeatureServer/2/query',

  // USFS National Forests
  nationalForests: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0/query',

  // Wilderness Areas
  wilderness: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Wilderness_Areas/FeatureServer/0/query',

  // State Parks
  stateParks: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_State_Parks/FeatureServer/0/query',

  // Protected Areas (includes various designations)
  protectedAreas: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Protected_Areas/FeatureServer/0/query',

  // Trails (USFS National Trail System)
  trails: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublic_01/MapServer/0/query',

  // Trailheads
  trailheads: 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/NPS_Public_POIs/FeatureServer/0/query',

  // GNIS Geographic Names (for place name searches)
  gnis: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Geographic_Names/FeatureServer/0/query',

  // Water features - NHD
  waterFeatures: 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query',

  // Waterfalls
  waterfalls: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Geographic_Names/FeatureServer/0/query',
};

// Generate a unique ID for each feature
const generateFeatureId = (feature: Feature, index: number, layerType: string): string => {
  const props = feature.properties || {};
  const idFields = ['GEOID', 'OBJECTID', 'FID', 'id', 'ID', 'UNIT_CODE', 'NAME', 'name'];

  for (const field of idFields) {
    if (props[field]) {
      return `${layerType}_${props[field]}`;
    }
  }

  return `${layerType}_${index}`;
};

// Add unique IDs to all features in a collection
export const addFeatureIds = (
  data: FeatureCollection,
  layerType: string
): FeatureCollection => {
  return {
    ...data,
    features: data.features.map((feature, index) => ({
      ...feature,
      properties: {
        ...feature.properties,
        _featureId: generateFeatureId(feature, index, layerType),
      },
    })),
  };
};

// Filter features to western US states
export const filterToWesternUS = (data: FeatureCollection): FeatureCollection => {
  const westernStateSet = new Set(WESTERN_US_STATES);
  const westernNames = [
    'Washington', 'Oregon', 'California', 'Idaho', 'Nevada',
    'Montana', 'Wyoming', 'Utah', 'Colorado', 'Arizona', 'New Mexico',
    'Alaska'
  ];

  return {
    ...data,
    features: data.features.filter((feature) => {
      const props = feature.properties || {};
      const stateCode = props.STATE || props.STUSPS || props.state || props.STATE_ABBR;
      const stateName = props.NAME || props.name || props.STATE_NAME;

      if (stateCode && westernStateSet.has(stateCode)) return true;
      if (stateName && westernNames.includes(stateName)) return true;

      return false;
    }),
  };
};

// Western US state FIPS codes (AZ, CA, CO, ID, MT, NV, NM, OR, UT, WA, WY + AK)
const WESTERN_STATE_FIPS = ['02', '04', '06', '08', '16', '30', '32', '35', '41', '49', '53', '56'];

// Fetch and process state boundaries
export const loadStates = async (): Promise<FeatureCollection> => {
  const response = await fetch(DATA_SOURCES.states);
  if (!response.ok) throw new Error('Failed to load state boundaries');

  const data = await response.json();
  const westernData = filterToWesternUS(data);
  return addFeatureIds(westernData, 'state');
};

// Fetch and process county boundaries
export const loadCounties = async (): Promise<FeatureCollection> => {
  const response = await fetch(DATA_SOURCES.counties);
  if (!response.ok) throw new Error('Failed to load county boundaries');

  const data = await response.json();

  const westernCounties: FeatureCollection = {
    type: 'FeatureCollection',
    features: data.features.filter((feature: Feature) => {
      const fips = feature.id || feature.properties?.GEO_ID || '';
      const stateFips = String(fips).substring(0, 2);
      return WESTERN_STATE_FIPS.includes(stateFips);
    }),
  };

  return addFeatureIds(westernCounties, 'county');
};

// Fetch NPS units and filter by designation type
const loadNPSUnits = async (designationType: string): Promise<FeatureCollection> => {
  try {
    // Query Western US
    const westernUrl = buildArcGISQuery(DATA_SOURCES.npsUnits, WESTERN_BOUNDS);
    const westernResponse = await fetch(westernUrl);

    let features: Feature[] = [];

    if (westernResponse.ok) {
      const westernData = await westernResponse.json();
      features = westernData.features || [];
    }

    // Also query Alaska
    try {
      const alaskaUrl = buildArcGISQuery(DATA_SOURCES.npsUnits, ALASKA_BOUNDS);
      const alaskaResponse = await fetch(alaskaUrl);
      if (alaskaResponse.ok) {
        const alaskaData = await alaskaResponse.json();
        features = [...features, ...(alaskaData.features || [])];
      }
    } catch {
      // Alaska query failed, continue with western data only
    }

    // Filter by designation type
    const filtered: FeatureCollection = {
      type: 'FeatureCollection',
      features: features.filter((f: Feature) => {
        const designation = f.properties?.UNIT_TYPE || f.properties?.PARKNAME || '';
        return designation.toLowerCase().includes(designationType.toLowerCase());
      }),
    };

    return addFeatureIds(filtered, designationType.replace(/\s+/g, '_').toLowerCase());
  } catch (error) {
    console.error(`Error loading NPS ${designationType}:`, error);
    throw error;
  }
};

// Fetch National Parks
export const loadNationalParks = async (): Promise<FeatureCollection> => {
  try {
    const westernUrl = buildArcGISQuery(DATA_SOURCES.npsUnits, WESTERN_BOUNDS);
    const westernResponse = await fetch(westernUrl);

    let features: Feature[] = [];

    if (westernResponse.ok) {
      const westernData = await westernResponse.json();
      features = westernData.features || [];
    }

    // Also query Alaska for parks like Denali, Glacier Bay, etc.
    try {
      const alaskaUrl = buildArcGISQuery(DATA_SOURCES.npsUnits, ALASKA_BOUNDS);
      const alaskaResponse = await fetch(alaskaUrl);
      if (alaskaResponse.ok) {
        const alaskaData = await alaskaResponse.json();
        features = [...features, ...(alaskaData.features || [])];
      }
    } catch {
      // Continue without Alaska data
    }

    // Filter to National Parks only
    const parks: FeatureCollection = {
      type: 'FeatureCollection',
      features: features.filter((f: Feature) => {
        const unitType = (f.properties?.UNIT_TYPE || '').toLowerCase();
        return unitType.includes('national park') && !unitType.includes('parkway');
      }),
    };

    return addFeatureIds(parks, 'national_park');
  } catch (error) {
    console.error('Error loading national parks:', error);
    throw error;
  }
};

// Fetch National Monuments
export const loadNationalMonuments = async (): Promise<FeatureCollection> => {
  try {
    const westernUrl = buildArcGISQuery(DATA_SOURCES.npsUnits, WESTERN_BOUNDS);
    const alaskaUrl = buildArcGISQuery(DATA_SOURCES.npsUnits, ALASKA_BOUNDS);

    const [westernResponse, alaskaResponse] = await Promise.all([
      fetch(westernUrl),
      fetch(alaskaUrl).catch(() => null)
    ]);

    let features: Feature[] = [];

    if (westernResponse.ok) {
      const data = await westernResponse.json();
      features = data.features || [];
    }

    if (alaskaResponse?.ok) {
      const data = await alaskaResponse.json();
      features = [...features, ...(data.features || [])];
    }

    const monuments: FeatureCollection = {
      type: 'FeatureCollection',
      features: features.filter((f: Feature) => {
        const unitType = (f.properties?.UNIT_TYPE || '').toLowerCase();
        return unitType.includes('monument');
      }),
    };

    return addFeatureIds(monuments, 'national_monument');
  } catch (error) {
    console.error('Error loading national monuments:', error);
    throw error;
  }
};

// Fetch National Recreation Areas
export const loadRecreationAreas = async (): Promise<FeatureCollection> => {
  try {
    const westernUrl = buildArcGISQuery(DATA_SOURCES.npsUnits, WESTERN_BOUNDS);
    const response = await fetch(westernUrl);

    if (!response.ok) throw new Error('Failed to load recreation areas');

    const data = await response.json();

    const recAreas: FeatureCollection = {
      type: 'FeatureCollection',
      features: (data.features || []).filter((f: Feature) => {
        const unitType = (f.properties?.UNIT_TYPE || '').toLowerCase();
        return unitType.includes('recreation area') || unitType.includes('scenic area');
      }),
    };

    return addFeatureIds(recAreas, 'recreation_area');
  } catch (error) {
    console.error('Error loading recreation areas:', error);
    throw error;
  }
};

// Fetch National Conservation Areas (BLM managed)
export const loadConservationAreas = async (): Promise<FeatureCollection> => {
  try {
    // Use protected areas database and filter for conservation areas
    const url = buildArcGISQuery(DATA_SOURCES.protectedAreas, WESTERN_BOUNDS, '&resultRecordCount=2000');
    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to load conservation areas');

    const data = await response.json();

    const conservationAreas: FeatureCollection = {
      type: 'FeatureCollection',
      features: (data.features || []).filter((f: Feature) => {
        const designation = (f.properties?.Des_Tp || f.properties?.DESGNTN || '').toLowerCase();
        const name = (f.properties?.NAME || f.properties?.Unit_Nm || '').toLowerCase();
        return designation.includes('conservation') ||
               name.includes('conservation area') ||
               name.includes('nca');
      }),
    };

    return addFeatureIds(conservationAreas, 'conservation_area');
  } catch (error) {
    console.error('Error loading conservation areas:', error);
    throw error;
  }
};

// Fetch National Forests
export const loadNationalForests = async (): Promise<FeatureCollection> => {
  try {
    const url = buildArcGISQuery(DATA_SOURCES.nationalForests, WESTERN_BOUNDS);
    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to load national forests');

    const data = await response.json();
    return addFeatureIds(data, 'national_forest');
  } catch (error) {
    console.error('Error loading national forests:', error);
    throw error;
  }
};

// Fetch Wilderness Areas
export const loadWildernessAreas = async (): Promise<FeatureCollection> => {
  try {
    const westernUrl = buildArcGISQuery(DATA_SOURCES.wilderness, WESTERN_BOUNDS);
    const alaskaUrl = buildArcGISQuery(DATA_SOURCES.wilderness, ALASKA_BOUNDS);

    const [westernResponse, alaskaResponse] = await Promise.all([
      fetch(westernUrl),
      fetch(alaskaUrl).catch(() => null)
    ]);

    let features: Feature[] = [];

    if (westernResponse.ok) {
      const data = await westernResponse.json();
      features = data.features || [];
    }

    if (alaskaResponse?.ok) {
      const data = await alaskaResponse.json();
      features = [...features, ...(data.features || [])];
    }

    return addFeatureIds({ type: 'FeatureCollection', features }, 'wilderness');
  } catch (error) {
    console.error('Error loading wilderness areas:', error);
    throw error;
  }
};

// Fetch State Parks
export const loadStateParks = async (): Promise<FeatureCollection> => {
  try {
    const url = buildArcGISQuery(DATA_SOURCES.stateParks, WESTERN_BOUNDS, '&resultRecordCount=1000');
    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to load state parks');

    const data = await response.json();
    return addFeatureIds(data, 'state_park');
  } catch (error) {
    console.error('Error loading state parks:', error);
    throw error;
  }
};

// Load GeoJSON from a file or URL
export const loadGeoJSON = async (
  source: string | File,
  layerType: string
): Promise<FeatureCollection> => {
  let data: FeatureCollection;

  if (source instanceof File) {
    const text = await source.text();
    data = JSON.parse(text);
  } else {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Failed to load data from ${source}`);
    data = await response.json();
  }

  if ((data as any).type === 'Topology') {
    throw new Error('TopoJSON format detected. Please convert to GeoJSON first.');
  }

  return addFeatureIds(data, layerType);
};

// Get available properties from a FeatureCollection for filtering
export const getAvailableProperties = (data: FeatureCollection): string[] => {
  const propSet = new Set<string>();

  data.features.forEach((feature) => {
    if (feature.properties) {
      Object.keys(feature.properties).forEach((key) => {
        if (!key.startsWith('_')) {
          propSet.add(key);
        }
      });
    }
  });

  return Array.from(propSet).sort();
};

// Get unique values for a property
export const getPropertyValues = (
  data: FeatureCollection,
  property: string
): (string | number)[] => {
  const values = new Set<string | number>();

  data.features.forEach((feature) => {
    const value = feature.properties?.[property];
    if (value !== undefined && value !== null) {
      values.add(value);
    }
  });

  return Array.from(values).sort();
};

// Get property statistics for numeric fields
export const getPropertyStats = (
  data: FeatureCollection,
  property: string
): { min: number; max: number; avg: number; count: number } | null => {
  const values: number[] = [];

  data.features.forEach((feature) => {
    const value = feature.properties?.[property];
    if (typeof value === 'number' && !isNaN(value)) {
      values.push(value);
    }
  });

  if (values.length === 0) return null;

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    count: values.length,
  };
};

// ============================================
// BTME-specific data loaders
// ============================================

// Fetch trails (for elimination - "not near trails")
export const loadTrails = async (): Promise<FeatureCollection> => {
  try {
    const url = buildArcGISQuery(DATA_SOURCES.trails, WESTERN_BOUNDS, '&resultRecordCount=3000');
    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to load trails');

    const data = await response.json();
    return addFeatureIds(data, 'trail');
  } catch (error) {
    console.error('Error loading trails:', error);
    throw error;
  }
};

// Fetch trailheads/parking (access points)
export const loadTrailheads = async (): Promise<FeatureCollection> => {
  try {
    // Query for parking and trailhead POIs
    const url = `${DATA_SOURCES.trailheads}?where=POITYPE%20LIKE%20%27%25Trail%25%27%20OR%20POITYPE%20LIKE%20%27%25Parking%25%27&outFields=*&f=geojson&resultRecordCount=2000`;
    const response = await fetch(url);

    if (!response.ok) {
      // Fallback to GNIS for trailhead search
      return searchPlaceNames(['trailhead', 'parking']);
    }

    const data = await response.json();
    return addFeatureIds(data, 'trailhead');
  } catch (error) {
    console.error('Error loading trailheads:', error);
    // Return empty if fails
    return { type: 'FeatureCollection', features: [] };
  }
};

// Search for place names matching keywords (for poem clues)
export const searchPlaceNames = async (keywords: string[]): Promise<FeatureCollection> => {
  try {
    // Build OR query for all keywords
    const whereClause = keywords
      .map(k => `GNIS_NAME LIKE '%${k}%'`)
      .join(' OR ');

    const url = `${DATA_SOURCES.gnis}?where=${encodeURIComponent(whereClause)}&outFields=*&f=geojson&geometry=${encodeURIComponent(JSON.stringify({
      xmin: WESTERN_BOUNDS.xmin,
      ymin: WESTERN_BOUNDS.ymin,
      xmax: WESTERN_BOUNDS.xmax,
      ymax: WESTERN_BOUNDS.ymax,
      spatialReference: { wkid: 4326 }
    }))}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&resultRecordCount=500`;

    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to search place names');

    const data = await response.json();
    return addFeatureIds(data, 'place_name');
  } catch (error) {
    console.error('Error searching place names:', error);
    return { type: 'FeatureCollection', features: [] };
  }
};

// BTME Poem keywords for place name searches
export const POEM_KEYWORDS = {
  bear: ['Bear', 'Ursa', 'Grizzly', 'Kodiak'],
  bride: ['Bride', 'Wedding', 'Bridal', 'Veil'],
  granite: ['Granite', 'Stone', 'Rock', 'Boulder'],
  water: ['Falls', 'Waterfall', 'Spring', 'Creek', 'River'],
  arch: ['Arch', 'Arc', 'Double'],
  face: ['Face', 'Head', 'Profile', 'Lookout', 'View'],
  hole: ['Hole', 'Cave', 'Hollow', 'Gap'],
};

// Load water features (falls, springs)
export const loadWaterFeatures = async (): Promise<FeatureCollection> => {
  try {
    // Search GNIS for waterfalls and springs
    const keywords = ['Falls', 'Waterfall', 'Spring', 'Hot Spring'];
    const whereClause = keywords
      .map(k => `GNIS_NAME LIKE '%${k}%'`)
      .join(' OR ');

    const url = `${DATA_SOURCES.waterfalls}?where=${encodeURIComponent(whereClause)}&outFields=*&f=geojson&geometry=${encodeURIComponent(JSON.stringify({
      xmin: WESTERN_BOUNDS.xmin,
      ymin: WESTERN_BOUNDS.ymin,
      xmax: WESTERN_BOUNDS.xmax,
      ymax: WESTERN_BOUNDS.ymax,
      spatialReference: { wkid: 4326 }
    }))}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&resultRecordCount=1000`;

    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to load water features');

    const data = await response.json();
    return addFeatureIds(data, 'water_feature');
  } catch (error) {
    console.error('Error loading water features:', error);
    return { type: 'FeatureCollection', features: [] };
  }
};

// Search for features by poem clue category
export const searchByPoemClue = async (clueCategory: keyof typeof POEM_KEYWORDS): Promise<FeatureCollection> => {
  const keywords = POEM_KEYWORDS[clueCategory];
  return searchPlaceNames(keywords);
};

// Filter existing layer features by name containing keywords
export const filterFeaturesByName = (
  data: FeatureCollection,
  keywords: string[]
): FeatureCollection => {
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  return {
    type: 'FeatureCollection',
    features: data.features.filter(feature => {
      const name = (
        feature.properties?.NAME ||
        feature.properties?.name ||
        feature.properties?.GNIS_NAME ||
        feature.properties?.UNIT_NAME ||
        ''
      ).toLowerCase();

      return lowerKeywords.some(keyword => name.includes(keyword));
    }),
  };
};
