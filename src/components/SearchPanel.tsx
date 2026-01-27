import { useState, useMemo, useCallback } from 'react';
import { useMapStore } from '../store/mapStore';
import type { Feature } from 'geojson';

interface SearchResult {
  layerId: string;
  layerName: string;
  featureId: string;
  displayName: string;
  properties: Record<string, any>;
}

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const layers = useMapStore((s) => s.layers);
  const { selectFeature, setMapState } = useMapStore();

  const searchResults = useMemo((): SearchResult[] => {
    if (!query || query.length < 2) return [];

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const layer of layers) {
      if (!layer.data || !layer.visible) continue;

      for (const feature of layer.data.features) {
        if (!feature.properties) continue;

        const featureId = feature.properties._featureId;
        const props = feature.properties;

        // Search through all properties
        const matches = Object.entries(props).some(([key, value]) => {
          if (key.startsWith('_')) return false;
          return String(value).toLowerCase().includes(lowerQuery);
        });

        if (matches) {
          // Find a good display name
          const displayName =
            props.NAME ||
            props.name ||
            props.ZCTA ||
            props.UNIT_NAME ||
            props.GEOID ||
            featureId;

          results.push({
            layerId: layer.id,
            layerName: layer.name,
            featureId,
            displayName: String(displayName),
            properties: props,
          });
        }

        // Limit results
        if (results.length >= 50) break;
      }

      if (results.length >= 50) break;
    }

    return results;
  }, [query, layers]);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      selectFeature(result.layerId, result.featureId, false);

      // Find the feature to zoom to it
      const layer = layers.find((l) => l.id === result.layerId);
      const feature = layer?.data?.features.find(
        (f) => f.properties?._featureId === result.featureId
      );

      if (feature) {
        // Calculate centroid for zooming
        const bounds = getBoundingBox(feature);
        if (bounds) {
          setMapState({
            center: [
              (bounds[1] + bounds[3]) / 2, // lat
              (bounds[0] + bounds[2]) / 2, // lng
            ],
            zoom: 10,
          });
        }
      }

      setIsExpanded(false);
    },
    [layers, selectFeature, setMapState]
  );

  return (
    <div className={`search-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search features..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsExpanded(true);
          }}
          onFocus={() => setIsExpanded(true)}
        />
        {query && (
          <button className="clear-search" onClick={() => setQuery('')}>
            ×
          </button>
        )}
      </div>

      {isExpanded && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((result) => (
            <div
              key={`${result.layerId}-${result.featureId}`}
              className="search-result"
              onClick={() => handleSelectResult(result)}
            >
              <div className="result-name">{result.displayName}</div>
              <div className="result-layer">{result.layerName}</div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && query.length >= 2 && searchResults.length === 0 && (
        <div className="search-no-results">No features found</div>
      )}

      {isExpanded && (
        <div className="search-backdrop" onClick={() => setIsExpanded(false)} />
      )}
    </div>
  );
}

// Helper to get bounding box of a feature
function getBoundingBox(feature: Feature): [number, number, number, number] | null {
  const coords = getAllCoordinates(feature);
  if (coords.length === 0) return null;

  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLng, minLat, maxLng, maxLat];
}

function getAllCoordinates(feature: Feature): [number, number][] {
  const coords: [number, number][] = [];

  function extract(geometry: any) {
    if (!geometry) return;

    switch (geometry.type) {
      case 'Point':
        coords.push(geometry.coordinates);
        break;
      case 'MultiPoint':
      case 'LineString':
        coords.push(...geometry.coordinates);
        break;
      case 'MultiLineString':
      case 'Polygon':
        for (const ring of geometry.coordinates) {
          coords.push(...ring);
        }
        break;
      case 'MultiPolygon':
        for (const polygon of geometry.coordinates) {
          for (const ring of polygon) {
            coords.push(...ring);
          }
        }
        break;
      case 'GeometryCollection':
        for (const geom of geometry.geometries) {
          extract(geom);
        }
        break;
    }
  }

  extract(feature.geometry);
  return coords;
}
