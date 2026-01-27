import { useMapStore } from '../store/mapStore';
import { STABLE_LAND_TYPES } from '../types';
import type { LayerType } from '../types';

export function BTMEFiltersPanel() {
  const btmeFilters = useMapStore((s) => s.btmeFilters);
  const layers = useMapStore((s) => s.layers);
  const searchedAreas = useMapStore((s) => s.searchedAreas);
  const { setBTMEFilters, toggleLayerVisibility, setLayerStyle } = useMapStore();

  // Count layers by stability
  const stableLayers = layers.filter((l) =>
    STABLE_LAND_TYPES.includes(l.type as LayerType)
  );
  const otherLayers = layers.filter(
    (l) => !STABLE_LAND_TYPES.includes(l.type as LayerType) && l.type !== 'state' && l.type !== 'county'
  );

  const handleStableLandToggle = () => {
    const newValue = !btmeFilters.stableLandOnly;
    setBTMEFilters({ stableLandOnly: newValue });

    // Hide non-stable land layers when filter is on
    otherLayers.forEach((layer) => {
      if (newValue && layer.visible) {
        toggleLayerVisibility(layer.id);
      }
    });
  };

  const handleHighlightStable = () => {
    // Color stable land green, others yellow
    layers.forEach((layer) => {
      if (STABLE_LAND_TYPES.includes(layer.type as LayerType)) {
        setLayerStyle(layer.id, {
          fillColor: '#22c55e', // Green
          strokeColor: '#16a34a',
        });
      } else if (layer.type !== 'state' && layer.type !== 'county') {
        setLayerStyle(layer.id, {
          fillColor: '#eab308', // Yellow
          strokeColor: '#ca8a04',
        });
      }
    });
  };

  const searchedCount = searchedAreas.filter((a) => a.status === 'searched').length;
  const eliminatedCount = searchedAreas.filter((a) => a.status === 'eliminated').length;
  const interestCount = searchedAreas.filter((a) => a.status === 'interest').length;

  return (
    <div className="btme-filters-panel">
      <div className="panel-section">
        <h3>BTME Hunt Filters</h3>
        <p className="section-description">
          Quick filters based on Justin's statements from JIBLE 5.0
        </p>
      </div>

      {/* Elevation Filter */}
      <div className="panel-section">
        <h4>Elevation Limit</h4>
        <div className="filter-row">
          <label>
            <input
              type="checkbox"
              checked={btmeFilters.maxElevation !== null}
              onChange={(e) =>
                setBTMEFilters({
                  maxElevation: e.target.checked ? 11000 : null,
                })
              }
            />
            Below 11,000 ft only
          </label>
          <span className="filter-source">Source: X Dark Matters</span>
        </div>
        {btmeFilters.maxElevation !== null && (
          <div className="elevation-slider">
            <input
              type="range"
              min="5000"
              max="14000"
              step="500"
              value={btmeFilters.maxElevation}
              onChange={(e) =>
                setBTMEFilters({ maxElevation: parseInt(e.target.value) })
              }
            />
            <span>{btmeFilters.maxElevation.toLocaleString()} ft</span>
          </div>
        )}
      </div>

      {/* Stable Land Filter */}
      <div className="panel-section">
        <h4>Land Ownership Stability</h4>
        <div className="filter-row">
          <label>
            <input
              type="checkbox"
              checked={btmeFilters.stableLandOnly}
              onChange={handleStableLandToggle}
            />
            Stable ownership only (NPS, Wilderness)
          </label>
          <span className="filter-source">Source: Justin statement</span>
        </div>
        <button className="secondary-btn" onClick={handleHighlightStable}>
          Highlight Stable Land (Green)
        </button>
        <div className="land-legend">
          <div className="legend-item">
            <span className="color-dot stable"></span>
            <span>Stable: National Parks, Wilderness ({stableLayers.length})</span>
          </div>
          <div className="legend-item">
            <span className="color-dot other"></span>
            <span>Other Public Land ({otherLayers.length})</span>
          </div>
        </div>
      </div>

      {/* Map Bounds */}
      <div className="panel-section">
        <h4>Map Bounds</h4>
        <div className="filter-row">
          <label>
            <input
              type="checkbox"
              checked={btmeFilters.clipToBTMEBounds}
              onChange={(e) =>
                setBTMEFilters({ clipToBTMEBounds: e.target.checked })
              }
            />
            Clip to BTME map bounds
          </label>
        </div>
      </div>

      {/* Search Progress */}
      <div className="panel-section">
        <h4>Search Progress</h4>
        <div className="progress-stats">
          <div className="stat-item searched">
            <span className="stat-count">{searchedCount}</span>
            <span className="stat-label">Searched</span>
          </div>
          <div className="stat-item eliminated">
            <span className="stat-count">{eliminatedCount}</span>
            <span className="stat-label">Eliminated</span>
          </div>
          <div className="stat-item interest">
            <span className="stat-count">{interestCount}</span>
            <span className="stat-label">Of Interest</span>
          </div>
        </div>
        <div className="filter-row">
          <label>
            <input
              type="checkbox"
              checked={btmeFilters.showSearchedAreas}
              onChange={(e) =>
                setBTMEFilters({ showSearchedAreas: e.target.checked })
              }
            />
            Show searched areas
          </label>
        </div>
        <div className="filter-row">
          <label>
            <input
              type="checkbox"
              checked={btmeFilters.showEliminatedAreas}
              onChange={(e) =>
                setBTMEFilters({ showEliminatedAreas: e.target.checked })
              }
            />
            Show eliminated areas
          </label>
        </div>
      </div>

      {/* Quick Rules Reference */}
      <div className="panel-section rules-reference">
        <h4>Key Rules</h4>
        <ul className="rules-list">
          <li>Public land only (no private property)</li>
          <li>Not near man-made trails</li>
          <li>No caves, mines, or tunnels</li>
          <li>Low-clearance vehicle access (Prius OK)</li>
          <li>&lt; 1 mile hike to location</li>
          <li>24/7 accessible, no fee required</li>
          <li>Not underwater, no swimming needed</li>
        </ul>
      </div>
    </div>
  );
}
