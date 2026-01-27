import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import type { SearchedArea } from '../types';

const STATUS_COLORS = {
  searched: '#3b82f6',    // Blue
  eliminated: '#ef4444',  // Red
  interest: '#22c55e',    // Green
};

const STATUS_LABELS = {
  searched: 'Searched',
  eliminated: 'Eliminated',
  interest: 'Of Interest',
};

export function SearchAreaPanel() {
  const searchedAreas = useMapStore((s) => s.searchedAreas);
  const { addSearchedArea, updateSearchedArea, removeSearchedArea, clearSearchedAreas } =
    useMapStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newArea, setNewArea] = useState({
    name: '',
    status: 'searched' as SearchedArea['status'],
    notes: '',
    // Simplified bounds input - would be replaced with map drawing
    lat: '',
    lng: '',
  });

  const handleAddArea = () => {
    if (!newArea.name || !newArea.lat || !newArea.lng) return;

    const lat = parseFloat(newArea.lat);
    const lng = parseFloat(newArea.lng);

    // Create a small box around the point (0.1 degree ~= 7 miles)
    const bounds: [[number, number], [number, number]] = [
      [lat - 0.05, lng - 0.05],
      [lat + 0.05, lng + 0.05],
    ];

    addSearchedArea({
      name: newArea.name,
      bounds,
      status: newArea.status,
      notes: newArea.notes,
      color: STATUS_COLORS[newArea.status],
    });

    setNewArea({ name: '', status: 'searched', notes: '', lat: '', lng: '' });
    setIsAdding(false);
  };

  const groupedAreas = {
    interest: searchedAreas.filter((a) => a.status === 'interest'),
    searched: searchedAreas.filter((a) => a.status === 'searched'),
    eliminated: searchedAreas.filter((a) => a.status === 'eliminated'),
  };

  return (
    <div className="search-area-panel">
      <div className="panel-header">
        <h3>Search Areas</h3>
        <button
          className="add-area-btn"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? 'Cancel' : '+ Add Area'}
        </button>
      </div>

      {isAdding && (
        <div className="add-area-form">
          <div className="form-group">
            <label>Area Name</label>
            <input
              type="text"
              value={newArea.name}
              onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
              placeholder="e.g., Bob Marshall NW Corner"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                step="0.001"
                value={newArea.lat}
                onChange={(e) => setNewArea({ ...newArea, lat: e.target.value })}
                placeholder="47.5"
              />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                step="0.001"
                value={newArea.lng}
                onChange={(e) => setNewArea({ ...newArea, lng: e.target.value })}
                placeholder="-113.5"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={newArea.status}
              onChange={(e) =>
                setNewArea({
                  ...newArea,
                  status: e.target.value as SearchedArea['status'],
                })
              }
            >
              <option value="interest">Of Interest</option>
              <option value="searched">Searched</option>
              <option value="eliminated">Eliminated</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={newArea.notes}
              onChange={(e) => setNewArea({ ...newArea, notes: e.target.value })}
              placeholder="Why is this area interesting/eliminated?"
              rows={2}
            />
          </div>

          <button className="primary-btn" onClick={handleAddArea}>
            Add Area
          </button>
        </div>
      )}

      <div className="areas-list">
        {Object.entries(groupedAreas).map(([status, areas]) => (
          <div key={status} className="area-group">
            <h4 className={`group-header ${status}`}>
              <span
                className="status-dot"
                style={{ backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }}
              />
              {STATUS_LABELS[status as keyof typeof STATUS_LABELS]} ({areas.length})
            </h4>

            {areas.map((area) => (
              <div key={area.id} className="area-item">
                <div className="area-header">
                  <span className="area-name">{area.name}</span>
                  <div className="area-actions">
                    <select
                      value={area.status}
                      onChange={(e) =>
                        updateSearchedArea(area.id, {
                          status: e.target.value as SearchedArea['status'],
                          color: STATUS_COLORS[e.target.value as keyof typeof STATUS_COLORS],
                        })
                      }
                      className="status-select"
                    >
                      <option value="interest">Interest</option>
                      <option value="searched">Searched</option>
                      <option value="eliminated">Eliminated</option>
                    </select>
                    <button
                      className="delete-btn"
                      onClick={() => removeSearchedArea(area.id)}
                      title="Remove area"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {area.notes && <p className="area-notes">{area.notes}</p>}
                <span className="area-date">
                  Added {new Date(area.dateAdded).toLocaleDateString()}
                </span>
              </div>
            ))}

            {areas.length === 0 && (
              <p className="no-areas">No areas marked as {STATUS_LABELS[status as keyof typeof STATUS_LABELS].toLowerCase()}</p>
            )}
          </div>
        ))}
      </div>

      {searchedAreas.length > 0 && (
        <div className="panel-footer">
          <button className="danger-btn" onClick={clearSearchedAreas}>
            Clear All Areas
          </button>
        </div>
      )}
    </div>
  );
}
