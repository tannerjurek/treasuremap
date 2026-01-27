import { useState, useCallback } from 'react';
import { useMapStore } from '../store/mapStore';
import type { LayerType, GeoLayer } from '../types';
import {
  loadStates,
  loadNationalParks,
  loadGeoJSON,
  generateSampleZipCodes,
} from '../utils/dataLoader';
import { FilterPanel } from './FilterPanel';
import { ColorRulesPanel } from './ColorRulesPanel';
import { StylePanel } from './StylePanel';

const LAYER_TYPE_OPTIONS: { value: LayerType; label: string }[] = [
  { value: 'state', label: 'State Boundaries' },
  { value: 'county', label: 'Counties' },
  { value: 'zipcode', label: 'ZIP Codes' },
  { value: 'census_tract', label: 'Census Tracts' },
  { value: 'national_park', label: 'National Parks' },
  { value: 'national_forest', label: 'National Forests' },
  { value: 'blm_land', label: 'BLM Land' },
  { value: 'wilderness', label: 'Wilderness Areas' },
  { value: 'tribal_land', label: 'Tribal Lands' },
  { value: 'custom', label: 'Custom GeoJSON' },
];

const DEFAULT_COLORS = [
  '#3388ff', '#ff3333', '#33ff33', '#ffff33',
  '#ff33ff', '#33ffff', '#ff8833', '#8833ff',
  '#33ff88', '#ff3388',
];

function LayerItem({ layer }: { layer: GeoLayer }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'colors' | 'style'>('filters');
  const {
    toggleLayerVisibility,
    removeLayer,
    setLayerOpacity,
  } = useMapStore();

  const featureCount = layer.data?.features.length || 0;
  const selectedCount = layer.selectedFeatures.size;

  return (
    <div className={`layer-item ${!layer.visible ? 'layer-hidden' : ''}`}>
      <div className="layer-header" onClick={() => setIsExpanded(!isExpanded)}>
        <button
          className="visibility-toggle"
          onClick={(e) => {
            e.stopPropagation();
            toggleLayerVisibility(layer.id);
          }}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? '👁️' : '👁️‍🗨️'}
        </button>

        <div className="layer-info">
          <span className="layer-name">{layer.name}</span>
          <span className="layer-meta">
            {layer.loading ? 'Loading...' : `${featureCount} features`}
            {selectedCount > 0 && ` (${selectedCount} selected)`}
          </span>
        </div>

        <div className="layer-actions">
          <button
            className="remove-layer"
            onClick={(e) => {
              e.stopPropagation();
              removeLayer(layer.id);
            }}
            title="Remove layer"
          >
            ×
          </button>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="layer-details">
          {layer.error && (
            <div className="layer-error">Error: {layer.error}</div>
          )}

          <div className="opacity-control">
            <label>Opacity: {Math.round(layer.opacity * 100)}%</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={layer.opacity}
              onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
            />
          </div>

          <div className="layer-tabs">
            <button
              className={activeTab === 'filters' ? 'active' : ''}
              onClick={() => setActiveTab('filters')}
            >
              Filters
            </button>
            <button
              className={activeTab === 'colors' ? 'active' : ''}
              onClick={() => setActiveTab('colors')}
            >
              Colors
            </button>
            <button
              className={activeTab === 'style' ? 'active' : ''}
              onClick={() => setActiveTab('style')}
            >
              Style
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'filters' && <FilterPanel layerId={layer.id} />}
            {activeTab === 'colors' && <ColorRulesPanel layerId={layer.id} />}
            {activeTab === 'style' && <StylePanel layerId={layer.id} />}
          </div>
        </div>
      )}
    </div>
  );
}

export function LayerPanel() {
  const [isAddingLayer, setIsAddingLayer] = useState(false);
  const [newLayerType, setNewLayerType] = useState<LayerType>('state');
  const [newLayerName, setNewLayerName] = useState('');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customUrl, setCustomUrl] = useState('');

  const layers = useMapStore((s) => s.layers);
  const { addLayer, setLayerData, setLayerError } = useMapStore();

  const handleAddLayer = useCallback(async () => {
    const name = newLayerName || LAYER_TYPE_OPTIONS.find(o => o.value === newLayerType)?.label || 'New Layer';
    const color = DEFAULT_COLORS[layers.length % DEFAULT_COLORS.length];

    const layerId = `${newLayerType}_${Date.now()}`;

    addLayer({
      id: layerId,
      name,
      type: newLayerType,
      visible: true,
      data: null,
      loading: true,
      error: null,
      style: {
        fillColor: color,
        fillOpacity: 0.4,
        strokeColor: color,
        strokeWidth: 1,
        strokeOpacity: 0.8,
      },
      filters: [],
      colorRules: [],
      selectedFeatures: new Set(),
      opacity: 1,
      zIndex: layers.length,
    });

    setIsAddingLayer(false);
    setNewLayerName('');

    try {
      let data;

      switch (newLayerType) {
        case 'state':
          data = await loadStates();
          break;
        case 'national_park':
          data = await loadNationalParks();
          break;
        case 'zipcode':
          // Use sample data for demo
          data = generateSampleZipCodes(200);
          break;
        case 'custom':
          if (customFile) {
            data = await loadGeoJSON(customFile, 'custom');
          } else if (customUrl) {
            data = await loadGeoJSON(customUrl, 'custom');
          } else {
            throw new Error('Please provide a file or URL');
          }
          break;
        default:
          // Generate sample data for other types
          data = generateSampleZipCodes(100);
          break;
      }

      setLayerData(layerId, data);
    } catch (error) {
      setLayerError(layerId, error instanceof Error ? error.message : 'Unknown error');
    }
  }, [newLayerType, newLayerName, layers.length, customFile, customUrl, addLayer, setLayerData, setLayerError]);

  return (
    <div className="layer-panel">
      <div className="panel-header">
        <h2>Layers</h2>
        <button
          className="add-layer-btn"
          onClick={() => setIsAddingLayer(!isAddingLayer)}
        >
          {isAddingLayer ? 'Cancel' : '+ Add Layer'}
        </button>
      </div>

      {isAddingLayer && (
        <div className="add-layer-form">
          <div className="form-group">
            <label>Layer Type</label>
            <select
              value={newLayerType}
              onChange={(e) => setNewLayerType(e.target.value as LayerType)}
            >
              {LAYER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Layer Name (optional)</label>
            <input
              type="text"
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              placeholder="Enter custom name..."
            />
          </div>

          {newLayerType === 'custom' && (
            <>
              <div className="form-group">
                <label>GeoJSON File</label>
                <input
                  type="file"
                  accept=".json,.geojson"
                  onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="form-group">
                <label>Or GeoJSON URL</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          <button className="create-layer-btn" onClick={handleAddLayer}>
            Create Layer
          </button>
        </div>
      )}

      <div className="layers-list">
        {layers.length === 0 ? (
          <p className="no-layers">No layers added yet. Click "Add Layer" to get started.</p>
        ) : (
          layers
            .slice()
            .reverse()
            .map((layer) => <LayerItem key={layer.id} layer={layer} />)
        )}
      </div>
    </div>
  );
}
