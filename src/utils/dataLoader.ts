import type { FeatureCollection, Feature } from 'geojson';
import { WESTERN_US_STATES } from '../types';

// Public data sources for geographic boundaries
const DATA_SOURCES = {
  // Census Bureau TIGER/Line Shapefiles (converted to GeoJSON)
  states: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',

  // Alternative sources for different geography types
  counties: (state: string) =>
    `https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states/${state}-counties.json`,

  // National Park Service boundaries
  nationalParks: 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/NPS_Land_Resources_Division_Boundary_and_Tract_Data_Service/FeatureServer/2/query?outFields=*&where=1%3D1&f=geojson',

  // USGS Protected Areas
  protectedAreas: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Protected_Areas/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson',
};

// Generate a unique ID for each feature
const generateFeatureId = (feature: Feature, index: number, layerType: string): string => {
  const props = feature.properties || {};

  // Try common ID fields
  const idFields = ['GEOID', 'GEOID10', 'GEOID20', 'ZCTA5CE10', 'ZCTA5CE20',
                    'OBJECTID', 'FID', 'id', 'ID', 'NAME', 'name', 'UNIT_CODE'];

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

  return {
    ...data,
    features: data.features.filter((feature) => {
      const props = feature.properties || {};
      // Check various state property names
      const stateCode = props.STATE || props.STUSPS || props.state ||
                       props.STATE_ABBR || props.STATEABBR;
      const stateName = props.NAME || props.name || props.STATE_NAME;

      if (stateCode && westernStateSet.has(stateCode)) return true;

      // Check by full state name
      const westernNames = [
        'Washington', 'Oregon', 'California', 'Idaho', 'Nevada',
        'Montana', 'Wyoming', 'Utah', 'Colorado', 'Arizona', 'New Mexico',
        'Alaska', 'Hawaii'
      ];
      if (stateName && westernNames.includes(stateName)) return true;

      return false;
    }),
  };
};

// Fetch and process state boundaries
export const loadStates = async (): Promise<FeatureCollection> => {
  const response = await fetch(DATA_SOURCES.states);
  if (!response.ok) throw new Error('Failed to load state boundaries');

  const data = await response.json();
  const westernData = filterToWesternUS(data);
  return addFeatureIds(westernData, 'state');
};

// Fetch and process national parks
export const loadNationalParks = async (): Promise<FeatureCollection> => {
  try {
    const response = await fetch(DATA_SOURCES.nationalParks);
    if (!response.ok) throw new Error('Failed to load national parks');

    const data = await response.json();

    // Filter to western US based on coordinates
    const westernParks: FeatureCollection = {
      type: 'FeatureCollection',
      features: data.features.filter((feature: Feature) => {
        // Check if centroid is in western US bounds
        // Simplified check - in production would use proper spatial query
        // For now, include all parks and filter in UI if needed
        return feature.geometry.type === 'Polygon' ||
               feature.geometry.type === 'MultiPolygon' ||
               true;
      }),
    };

    return addFeatureIds(westernParks, 'national_park');
  } catch (error) {
    console.error('Error loading national parks:', error);
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

  // Handle TopoJSON if needed
  if ((data as any).type === 'Topology') {
    // Would need topojson-client library for proper conversion
    throw new Error('TopoJSON format detected. Please convert to GeoJSON first.');
  }

  return addFeatureIds(data, layerType);
};

// Parse CSV with geographic data and convert to points
export const loadCSVAsPoints = async (
  file: File,
  latField: string,
  lngField: string
): Promise<FeatureCollection> => {
  const Papa = await import('papaparse');

  return new Promise((resolve, reject) => {
    Papa.default.parse(file, {
      header: true,
      complete: (results) => {
        const features: Feature[] = results.data
          .filter((row: any) => row[latField] && row[lngField])
          .map((row: any, index: number) => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [parseFloat(row[lngField]), parseFloat(row[latField])],
            },
            properties: {
              ...row,
              _featureId: `csv_point_${index}`,
            },
          }));

        resolve({
          type: 'FeatureCollection',
          features,
        });
      },
      error: (error) => reject(error),
    });
  });
};

// Fetch ZIP code boundaries from Census TIGER
// Note: Full ZCTA data is large (~500MB), so we'd typically use a tile server
// This is a simplified approach using state-level files
export const loadZipCodes = async (_stateCode: string): Promise<FeatureCollection> => {
  // In production, you'd use Census Bureau's API or a tile server
  // For now, return placeholder that would be filled with actual data
  console.warn('ZIP code loading requires setting up a data source');
  return {
    type: 'FeatureCollection',
    features: [],
  };
};

// Sample data generator for demo purposes
export const generateSampleZipCodes = (count: number = 100): FeatureCollection => {
  const features: Feature[] = [];

  // Generate random polygons in western US bounds
  for (let i = 0; i < count; i++) {
    const centerLat = 32 + Math.random() * 16; // ~32-48 latitude
    const centerLng = -124 + Math.random() * 22; // ~-124 to -102 longitude
    const size = 0.1 + Math.random() * 0.2;

    // Create a simple square polygon
    const coords = [
      [
        [centerLng - size, centerLat - size],
        [centerLng + size, centerLat - size],
        [centerLng + size, centerLat + size],
        [centerLng - size, centerLat + size],
        [centerLng - size, centerLat - size],
      ],
    ];

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: coords,
      },
      properties: {
        _featureId: `sample_zip_${i}`,
        ZCTA: String(80000 + i).padStart(5, '0'),
        population: Math.floor(Math.random() * 50000),
        medianIncome: Math.floor(30000 + Math.random() * 70000),
        state: WESTERN_US_STATES[Math.floor(Math.random() * WESTERN_US_STATES.length)],
        urbanRural: Math.random() > 0.5 ? 'urban' : 'rural',
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
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
