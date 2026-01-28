import { useState, useCallback } from 'react';
import { useMapStore } from '../store/mapStore';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, LineString } from 'geojson';

// Safe combination coordinates - Easter egg / reference anchor
const SAFE_ANCHOR = {
  lat: 44.26,
  lng: -110.5,
  label: 'Safe Combination Anchor',
};

// Polaris, Montana - Posey family proximity exclusion
const POLARIS_MT = {
  lat: 45.4011,
  lng: -113.1338,
  label: 'Polaris, MT (Exclusion Zone)',
};

// Fee-entry National Parks to exclude (Western US)
export const FEE_PARKS = [
  'Yellowstone',
  'Grand Teton',
  'Glacier',
  'Yosemite',
  'Grand Canyon',
  'Zion',
  'Bryce Canyon',
  'Arches',
  'Canyonlands',
  'Capitol Reef',
  'Rocky Mountain',
  'Mesa Verde',
  'Great Sand Dunes',
  'Black Canyon of the Gunnison',
  'Carlsbad Caverns',
  'Guadalupe Mountains',
  'Joshua Tree',
  'Death Valley',
  'Sequoia',
  'Kings Canyon',
  'Pinnacles',
  'Lassen Volcanic',
  'Redwood',
  'Crater Lake',
  'Mount Rainier',
  'Olympic',
  'North Cascades',
];

// Free-entry areas (Wilderness, National Monuments, some NPS units)
export const FREE_ENTRY_TYPES = [
  'wilderness',
  'national_monument',
  'national_forest',
];

interface BearingLine {
  id: string;
  origin: [number, number];
  bearing: number;
  distance: number; // miles
  label: string;
}

export function GeometryToolsPanel() {
  const [bearingLines, setBearingLines] = useState<BearingLine[]>([]);
  const [newOriginLat, setNewOriginLat] = useState('');
  const [newOriginLng, setNewOriginLng] = useState('');
  const [newBearing, setNewBearing] = useState('20');
  const [newDistance, setNewDistance] = useState('5');
  const [showAnchor, setShowAnchor] = useState(false);
  const [showPolarisZone, setShowPolarisZone] = useState(false);

  const { addLayer, setLayerData, removeLayer } = useMapStore();

  // Create a geodesic line at specified bearing
  const createBearingLine = useCallback((
    origin: [number, number],
    bearing: number,
    distanceMiles: number
  ): Feature<LineString> => {
    const point = turf.point([origin[1], origin[0]]); // [lng, lat]
    const distanceKm = distanceMiles * 1.60934;
    const destination = turf.destination(point, distanceKm, bearing);

    const line = turf.lineString([
      [origin[1], origin[0]],
      destination.geometry.coordinates,
    ]);

    return line;
  }, []);

  // Add a new bearing line to the map
  const handleAddBearingLine = useCallback(() => {
    const lat = parseFloat(newOriginLat);
    const lng = parseFloat(newOriginLng);
    const bearing = parseFloat(newBearing);
    const distance = parseFloat(newDistance);

    if (isNaN(lat) || isNaN(lng) || isNaN(bearing) || isNaN(distance)) {
      alert('Please enter valid numbers for all fields');
      return;
    }

    const id = `bearing_${Date.now()}`;
    const line = createBearingLine([lat, lng], bearing, distance);

    const newLine: BearingLine = {
      id,
      origin: [lat, lng],
      bearing,
      distance,
      label: `${bearing}° from ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };

    // Add as a map layer
    const layerId = `geometry_${id}`;
    addLayer({
      id: layerId,
      name: `Bearing Line: ${bearing}°`,
      type: 'custom',
      visible: true,
      data: null,
      loading: false,
      error: null,
      style: {
        fillColor: '#ff0000',
        fillOpacity: 0,
        strokeColor: '#ff0000',
        strokeWidth: 3,
        strokeOpacity: 1,
      },
      filters: [],
      colorRules: [],
      selectedFeatures: new Set(),
      opacity: 1,
      zIndex: 100,
    });

    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          ...line,
          properties: {
            _featureId: id,
            bearing,
            distance,
            origin: `${lat}, ${lng}`,
          },
        },
        // Add origin point marker
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          properties: {
            _featureId: `${id}_origin`,
            name: `Origin: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          },
        },
      ],
    };

    setLayerData(layerId, fc);
    setBearingLines([...bearingLines, newLine]);
  }, [newOriginLat, newOriginLng, newBearing, newDistance, addLayer, setLayerData, createBearingLine, bearingLines]);

  // Remove a bearing line
  const handleRemoveBearingLine = useCallback((id: string) => {
    const layerId = `geometry_${id}`;
    removeLayer(layerId);
    setBearingLines(bearingLines.filter((l) => l.id !== id));
  }, [removeLayer, bearingLines]);

  // Toggle safe combination anchor point
  const handleToggleAnchor = useCallback(() => {
    const layerId = 'anchor_safe_combination';

    if (showAnchor) {
      removeLayer(layerId);
      setShowAnchor(false);
    } else {
      addLayer({
        id: layerId,
        name: 'Safe Anchor (44.26, -110.5)',
        type: 'custom',
        visible: true,
        data: null,
        loading: false,
        error: null,
        style: {
          fillColor: '#ffd700',
          fillOpacity: 1,
          strokeColor: '#ff8c00',
          strokeWidth: 3,
          strokeOpacity: 1,
        },
        filters: [],
        colorRules: [],
        selectedFeatures: new Set(),
        opacity: 1,
        zIndex: 200,
      });

      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [SAFE_ANCHOR.lng, SAFE_ANCHOR.lat],
          },
          properties: {
            _featureId: 'safe_anchor',
            name: SAFE_ANCHOR.label,
            description: 'Coordinates from safe combination',
          },
        }],
      };

      setLayerData(layerId, fc);
      setShowAnchor(true);
    }
  }, [showAnchor, addLayer, setLayerData, removeLayer]);

  // Toggle Polaris exclusion zone (1 mile buffer)
  const handleTogglePolarisZone = useCallback(() => {
    const layerId = 'exclusion_polaris';

    if (showPolarisZone) {
      removeLayer(layerId);
      setShowPolarisZone(false);
    } else {
      addLayer({
        id: layerId,
        name: 'Polaris, MT (1mi Exclusion)',
        type: 'custom',
        visible: true,
        data: null,
        loading: false,
        error: null,
        style: {
          fillColor: '#dc2626',
          fillOpacity: 0.3,
          strokeColor: '#dc2626',
          strokeWidth: 2,
          strokeOpacity: 0.8,
        },
        filters: [],
        colorRules: [],
        selectedFeatures: new Set(),
        opacity: 1,
        zIndex: 50,
      });

      // Create 1 mile buffer around Polaris
      const point = turf.point([POLARIS_MT.lng, POLARIS_MT.lat]);
      const buffered = turf.buffer(point, 1.60934, { units: 'kilometers' }); // 1 mile

      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          ...buffered,
          properties: {
            _featureId: 'polaris_exclusion',
            name: POLARIS_MT.label,
            description: 'Posey family proximity exclusion (>1 mile rule)',
          },
        } as Feature],
      };

      setLayerData(layerId, fc);
      setShowPolarisZone(true);
    }
  }, [showPolarisZone, addLayer, setLayerData, removeLayer]);

  // Use anchor as bearing origin
  const handleUseAnchorAsOrigin = useCallback(() => {
    setNewOriginLat(SAFE_ANCHOR.lat.toString());
    setNewOriginLng(SAFE_ANCHOR.lng.toString());
  }, []);

  return (
    <div className="geometry-tools-panel">
      <div className="panel-section">
        <h3>Geometry Tools</h3>
        <p className="section-description">
          Vector analysis for geometric solve approach
        </p>
      </div>

      {/* Reference Points */}
      <div className="panel-section">
        <h4>Reference Points</h4>

        <div className="reference-point">
          <label>
            <input
              type="checkbox"
              checked={showAnchor}
              onChange={handleToggleAnchor}
            />
            Show Safe Anchor (44.26°N, 110.5°W)
          </label>
          <span className="filter-source">From safe combination</span>
        </div>

        <div className="reference-point">
          <label>
            <input
              type="checkbox"
              checked={showPolarisZone}
              onChange={handleTogglePolarisZone}
            />
            Show Polaris, MT Exclusion (1mi)
          </label>
          <span className="filter-source">Posey family location</span>
        </div>
      </div>

      {/* 20° Bearing Tool */}
      <div className="panel-section">
        <h4>Bearing Line Tool</h4>
        <p className="helper-text">
          "Foot of three at twenty degree" - create geodesic vectors
        </p>

        <div className="form-group">
          <label>Origin Latitude</label>
          <input
            type="number"
            step="0.0001"
            value={newOriginLat}
            onChange={(e) => setNewOriginLat(e.target.value)}
            placeholder="e.g., 44.26"
          />
        </div>

        <div className="form-group">
          <label>Origin Longitude</label>
          <input
            type="number"
            step="0.0001"
            value={newOriginLng}
            onChange={(e) => setNewOriginLng(e.target.value)}
            placeholder="e.g., -110.5"
          />
        </div>

        <button
          className="secondary-btn"
          onClick={handleUseAnchorAsOrigin}
          style={{ marginBottom: '0.5rem' }}
        >
          Use Safe Anchor as Origin
        </button>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Bearing (°)</label>
            <input
              type="number"
              min="0"
              max="360"
              value={newBearing}
              onChange={(e) => setNewBearing(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Distance (mi)</label>
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={newDistance}
              onChange={(e) => setNewDistance(e.target.value)}
            />
          </div>
        </div>

        <button
          className="primary-btn full-width"
          onClick={handleAddBearingLine}
        >
          Add Bearing Line
        </button>

        <div className="quick-bearings">
          <span>Quick: </span>
          <button onClick={() => setNewBearing('20')}>20°</button>
          <button onClick={() => setNewBearing('90')}>90°</button>
          <button onClick={() => setNewBearing('180')}>180°</button>
          <button onClick={() => setNewBearing('270')}>270°</button>
        </div>
      </div>

      {/* Active Bearing Lines */}
      {bearingLines.length > 0 && (
        <div className="panel-section">
          <h4>Active Lines ({bearingLines.length})</h4>
          <div className="bearing-lines-list">
            {bearingLines.map((line) => (
              <div key={line.id} className="bearing-line-item">
                <span>{line.bearing}° × {line.distance}mi</span>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveBearingLine(line.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hard Constraints Reference */}
      <div className="panel-section">
        <h4>Hard Constraints</h4>
        <ul className="constraints-list">
          <li><strong>Elevation:</strong> Below 11,000 ft</li>
          <li><strong>Access:</strong> No entrance fee required</li>
          <li><strong>Distance:</strong> &lt;1 mile from vehicle</li>
          <li><strong>Structures:</strong> No buildings, mines, tunnels, railroads</li>
          <li><strong>Exclusion:</strong> &gt;1 mile from Posey properties</li>
        </ul>
      </div>
    </div>
  );
}
