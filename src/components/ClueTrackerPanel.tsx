import { useState, useCallback } from 'react';
import { useMapStore } from '../store/mapStore';
import * as turf from '@turf/turf';
import type { FeatureCollection } from 'geojson';

// The 10 sequential poem clues (order matters!)
const POEM_CLUES = [
  { id: 1, text: "As hope surges, dreams take flight", type: 'metaphor', keywords: ['hope', 'surge'] },
  { id: 2, text: "On waters' silent flight", type: 'geographic', keywords: ['water', 'river', 'stream', 'flight'] },
  { id: 3, text: "In ursa east his realm awaits", type: 'celestial', keywords: ['ursa', 'bear', 'east'] },
  { id: 4, text: "His bride stands guard at ancient gates", type: 'celestial', keywords: ['bride', 'spica', 'virgo', 'gate'] },
  { id: 5, text: "Round the bend, past the Hole", type: 'geographic', keywords: ['bend', 'hole', 'river'] },
  { id: 6, text: "Cast your line and find the pole", type: 'geographic', keywords: ['fishing', 'pole', 'cast'] },
  { id: 7, text: "At the foot of three at twenty degree", type: 'geometric', keywords: ['foot', 'three', 'twenty', 'degree'] },
  { id: 8, text: "Return her face to find the place", type: 'geometric', keywords: ['face', 'return', 'place'] },
  { id: 9, text: "Double arcs on granite bold", type: 'geographic', keywords: ['arc', 'double', 'granite', 'rock'] },
  { id: 10, text: "Wisdom waits in shadowed sight", type: 'geographic', keywords: ['wisdom', 'shadow', 'sight'] },
];

// Celestial reference points for the hunt (for future star chart overlay)
// const CELESTIAL_POINTS = {
//   polaris: { name: 'Polaris (North Star)', ra: 37.95, dec: 89.26 },
//   arcturus: { name: 'Arcturus (α Boötis)', ra: 213.92, dec: 19.18, note: 'Follow Big Dipper handle' },
//   spica: { name: 'Spica (α Virginis - The Bride)', ra: 201.30, dec: -11.16, note: 'Virgo = The Bride' },
//   dubhe: { name: 'Dubhe (α Ursa Major)', ra: 165.93, dec: 61.75 },
//   merak: { name: 'Merak (β Ursa Major)', ra: 165.46, dec: 56.38 },
// };

// Key locations for Wisdom, MT theory
const WISDOM_AREA = {
  wisdom: { lat: 45.6183, lng: -113.4469, name: 'Wisdom, Montana' },
  bigHoleRiver: { lat: 45.75, lng: -113.35, name: 'Big Hole River' },
  longitude113: { lat: 45.5, lng: -113.0, name: 'Longitude 113° Line' },
};

interface ClueLocation {
  clueId: number;
  lat: number;
  lng: number;
  confidence: number;
  notes: string;
}

export function ClueTrackerPanel() {
  const [clueLocations, setClueLocations] = useState<ClueLocation[]>([]);
  const [selectedClue, setSelectedClue] = useState<number | null>(null);
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [showCelestial, setShowCelestial] = useState(false);
  const [showWisdomArea, setShowWisdomArea] = useState(false);
  const [solutionTheory, setSolutionTheory] = useState<string>('wisdom-mt');

  const { addLayer, setLayerData, removeLayer } = useMapStore();

  // Add location for a clue
  const handleAddClueLocation = useCallback(() => {
    if (selectedClue === null) return;

    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates');
      return;
    }

    const newLocation: ClueLocation = {
      clueId: selectedClue,
      lat,
      lng,
      confidence,
      notes: newNotes,
    };

    setClueLocations([...clueLocations.filter(c => c.clueId !== selectedClue), newLocation]);

    // Update map layer
    updateCluePathLayer([...clueLocations.filter(c => c.clueId !== selectedClue), newLocation]);

    setNewLat('');
    setNewLng('');
    setNewNotes('');
  }, [selectedClue, newLat, newLng, confidence, newNotes, clueLocations]);

  // Update the clue path layer on map
  const updateCluePathLayer = useCallback((locations: ClueLocation[]) => {
    const layerId = 'clue_path';

    // Remove existing layer
    removeLayer(layerId);

    if (locations.length === 0) return;

    // Sort by clue ID (sequential order)
    const sorted = [...locations].sort((a, b) => a.clueId - b.clueId);

    // Create features for points
    const pointFeatures = sorted.map(loc => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [loc.lng, loc.lat],
      },
      properties: {
        _featureId: `clue_${loc.clueId}`,
        name: `Clue ${loc.clueId}: ${POEM_CLUES[loc.clueId - 1]?.text.substring(0, 30)}...`,
        clueId: loc.clueId,
        confidence: loc.confidence,
        notes: loc.notes,
      },
    }));

    // Create connecting line if 2+ points
    const lineFeatures = [];
    if (sorted.length >= 2) {
      const coords = sorted.map(loc => [loc.lng, loc.lat]);
      lineFeatures.push({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: coords,
        },
        properties: {
          _featureId: 'clue_path_line',
          name: 'Clue Path',
        },
      });
    }

    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [...pointFeatures, ...lineFeatures],
    };

    addLayer({
      id: layerId,
      name: 'Clue Path (Sequential)',
      type: 'custom',
      visible: true,
      data: null,
      loading: false,
      error: null,
      style: {
        fillColor: '#f59e0b',
        fillOpacity: 1,
        strokeColor: '#f59e0b',
        strokeWidth: 3,
        strokeOpacity: 0.8,
      },
      filters: [],
      colorRules: [],
      selectedFeatures: new Set(),
      opacity: 1,
      zIndex: 150,
    });

    setLayerData(layerId, fc);
  }, [addLayer, setLayerData, removeLayer]);

  // Toggle Wisdom, MT area focus
  const handleToggleWisdomArea = useCallback(() => {
    const layerId = 'wisdom_area';

    if (showWisdomArea) {
      removeLayer(layerId);
      setShowWisdomArea(false);
    } else {
      // Create features for Wisdom area
      const features = [
        // Wisdom town point
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [WISDOM_AREA.wisdom.lng, WISDOM_AREA.wisdom.lat] },
          properties: { _featureId: 'wisdom_town', name: WISDOM_AREA.wisdom.name },
        },
        // Big Hole River marker
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [WISDOM_AREA.bigHoleRiver.lng, WISDOM_AREA.bigHoleRiver.lat] },
          properties: { _featureId: 'big_hole', name: WISDOM_AREA.bigHoleRiver.name },
        },
        // Longitude 113 line
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [[-113.0, 44.5], [-113.0, 46.5]],
          },
          properties: { _featureId: 'lon_113', name: 'Longitude 113° (Book Clue)' },
        },
      ];

      const fc: FeatureCollection = { type: 'FeatureCollection', features };

      addLayer({
        id: layerId,
        name: 'Wisdom, MT Focus Area',
        type: 'custom',
        visible: true,
        data: null,
        loading: false,
        error: null,
        style: {
          fillColor: '#8b5cf6',
          fillOpacity: 0.8,
          strokeColor: '#8b5cf6',
          strokeWidth: 2,
          strokeOpacity: 1,
        },
        filters: [],
        colorRules: [],
        selectedFeatures: new Set(),
        opacity: 1,
        zIndex: 120,
      });

      setLayerData(layerId, fc);
      setShowWisdomArea(true);
    }
  }, [showWisdomArea, addLayer, setLayerData, removeLayer]);

  // Toggle celestial reference overlay
  const handleToggleCelestial = useCallback(() => {
    const layerId = 'celestial_refs';

    if (showCelestial) {
      removeLayer(layerId);
      setShowCelestial(false);
    } else {
      // For now, add reference markers at conceptual ground locations
      // Arcturus bearing from safe anchor (44.26°N, 110.5°W)
      const arcturusBearing = turf.destination(
        turf.point([-110.5, 44.26]),
        50,
        213.92 - 180, // Approximate azimuth
        { units: 'kilometers' }
      );

      const features = [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-110.5, 44.26] },
          properties: { _featureId: 'celestial_origin', name: 'Celestial Reference Origin (Safe Anchor)' },
        },
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [[-110.5, 44.26], arcturusBearing.geometry.coordinates],
          },
          properties: { _featureId: 'arcturus_bearing', name: 'Arcturus Bearing (conceptual)' },
        },
      ];

      const fc: FeatureCollection = { type: 'FeatureCollection', features };

      addLayer({
        id: layerId,
        name: 'Celestial References',
        type: 'custom',
        visible: true,
        data: null,
        loading: false,
        error: null,
        style: {
          fillColor: '#06b6d4',
          fillOpacity: 0.8,
          strokeColor: '#06b6d4',
          strokeWidth: 2,
          strokeOpacity: 1,
        },
        filters: [],
        colorRules: [],
        selectedFeatures: new Set(),
        opacity: 1,
        zIndex: 110,
      });

      setLayerData(layerId, fc);
      setShowCelestial(true);
    }
  }, [showCelestial, addLayer, setLayerData, removeLayer]);

  // Calculate total path distance
  const getPathDistance = useCallback(() => {
    if (clueLocations.length < 2) return 0;
    const sorted = [...clueLocations].sort((a, b) => a.clueId - b.clueId);
    let total = 0;
    for (let i = 1; i < sorted.length; i++) {
      const from = turf.point([sorted[i-1].lng, sorted[i-1].lat]);
      const to = turf.point([sorted[i].lng, sorted[i].lat]);
      total += turf.distance(from, to, { units: 'miles' });
    }
    return total.toFixed(2);
  }, [clueLocations]);

  return (
    <div className="clue-tracker-panel">
      <div className="panel-section">
        <h3>Sequential Clue Tracker</h3>
        <p className="section-description">
          Track all 10 poem clues in order. Justin confirmed clues are consecutive.
        </p>
      </div>

      {/* Solution Theory Selector */}
      <div className="panel-section">
        <h4>Solution Theory</h4>
        <select
          value={solutionTheory}
          onChange={(e) => setSolutionTheory(e.target.value)}
          className="theory-select"
        >
          <option value="wisdom-mt">Wisdom, Montana</option>
          <option value="yellowstone">Yellowstone Area</option>
          <option value="big-hole">Big Hole Valley</option>
          <option value="moab-ut">Moab, Utah</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Focus Area Toggles */}
      <div className="panel-section">
        <h4>Focus Areas</h4>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showWisdomArea}
            onChange={handleToggleWisdomArea}
          />
          Show Wisdom, MT Area
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showCelestial}
            onChange={handleToggleCelestial}
          />
          Show Celestial References
        </label>
      </div>

      {/* Clue List */}
      <div className="panel-section">
        <h4>Poem Clues ({clueLocations.length}/10 mapped)</h4>
        <div className="clue-list">
          {POEM_CLUES.map((clue) => {
            const location = clueLocations.find(c => c.clueId === clue.id);
            return (
              <div
                key={clue.id}
                className={`clue-item ${selectedClue === clue.id ? 'selected' : ''} ${location ? 'mapped' : ''}`}
                onClick={() => setSelectedClue(clue.id)}
              >
                <div className="clue-header">
                  <span className="clue-number">{clue.id}</span>
                  <span className={`clue-type ${clue.type}`}>{clue.type}</span>
                  {location && <span className="confidence-badge">{location.confidence}%</span>}
                </div>
                <div className="clue-text">{clue.text}</div>
                <div className="clue-keywords">
                  {clue.keywords.map(k => <span key={k} className="keyword">{k}</span>)}
                </div>
                {location && (
                  <div className="clue-location">
                    📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Location Form */}
      {selectedClue !== null && (
        <div className="panel-section">
          <h4>Map Clue #{selectedClue} Location</h4>
          <div className="form-group">
            <label>Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={newLat}
              onChange={(e) => setNewLat(e.target.value)}
              placeholder="e.g., 45.6183"
            />
          </div>
          <div className="form-group">
            <label>Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={newLng}
              onChange={(e) => setNewLng(e.target.value)}
              placeholder="e.g., -113.4469"
            />
          </div>
          <div className="form-group">
            <label>Confidence: {confidence}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Why this location?"
              rows={2}
            />
          </div>
          <button className="primary-btn full-width" onClick={handleAddClueLocation}>
            Set Location for Clue #{selectedClue}
          </button>
        </div>
      )}

      {/* Path Stats */}
      {clueLocations.length >= 2 && (
        <div className="panel-section">
          <h4>Path Analysis</h4>
          <div className="path-stats">
            <div className="stat">
              <span className="stat-label">Total Distance</span>
              <span className="stat-value">{getPathDistance()} mi</span>
            </div>
            <div className="stat">
              <span className="stat-label">Clues Mapped</span>
              <span className="stat-value">{clueLocations.length}/10</span>
            </div>
            <div className="stat">
              <span className="stat-label">Avg Confidence</span>
              <span className="stat-value">
                {Math.round(clueLocations.reduce((a, b) => a + b.confidence, 0) / clueLocations.length)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Celestial Reference */}
      <div className="panel-section">
        <h4>Celestial References</h4>
        <p className="helper-text">"In ursa east his realm awaits / His bride stands guard"</p>
        <ul className="celestial-list">
          <li><strong>Ursa Major:</strong> Big Dipper constellation</li>
          <li><strong>Arcturus:</strong> Follow handle of Big Dipper</li>
          <li><strong>Spica (The Bride):</strong> Virgo's brightest star</li>
          <li><strong>Polaris:</strong> North Star (the Pole)</li>
        </ul>
      </div>
    </div>
  );
}
