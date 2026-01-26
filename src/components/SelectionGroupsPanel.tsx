import { useState } from 'react';
import { useMapStore } from '../store/mapStore';

const DEFAULT_GROUP_COLORS = [
  '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
  '#ffff33', '#a65628', '#f781bf', '#66c2a5', '#fc8d62',
];

export function SelectionGroupsPanel() {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(DEFAULT_GROUP_COLORS[0]);

  const {
    selectionGroups,
    activeSelectionGroupId,
    layers,
    createSelectionGroup,
    deleteSelectionGroup,
    setActiveSelectionGroup,
    clearSelection,
  } = useMapStore();

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    createSelectionGroup(newGroupName, newGroupColor);
    setIsCreating(false);
    setNewGroupName('');
    setNewGroupColor(DEFAULT_GROUP_COLORS[selectionGroups.length % DEFAULT_GROUP_COLORS.length]);
  };

  const totalSelected = layers.reduce((sum, layer) => sum + layer.selectedFeatures.size, 0);

  return (
    <div className="selection-groups-panel">
      <div className="panel-header">
        <h2>Selection Groups</h2>
        <button
          className="add-group-btn"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {isCreating && (
        <div className="create-group-form">
          <div className="form-row">
            <input
              type="text"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              autoFocus
            />
            <input
              type="color"
              value={newGroupColor}
              onChange={(e) => setNewGroupColor(e.target.value)}
            />
          </div>
          <div className="preset-colors">
            {DEFAULT_GROUP_COLORS.map((color) => (
              <button
                key={color}
                className={`color-preset ${newGroupColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setNewGroupColor(color)}
              />
            ))}
          </div>
          <button
            className="create-btn"
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim()}
          >
            Create Group
          </button>
        </div>
      )}

      <div className="selection-info">
        <span>{totalSelected} features currently selected</span>
        {totalSelected > 0 && (
          <button className="clear-all-btn" onClick={() => clearSelection()}>
            Clear All
          </button>
        )}
      </div>

      <div className="groups-list">
        {selectionGroups.length === 0 ? (
          <p className="no-groups">
            Create selection groups to save and color multiple features together.
            Click features while a group is active to add them.
          </p>
        ) : (
          selectionGroups.map((group) => (
            <div
              key={group.id}
              className={`group-item ${activeSelectionGroupId === group.id ? 'active' : ''}`}
              onClick={() =>
                setActiveSelectionGroup(
                  activeSelectionGroupId === group.id ? null : group.id
                )
              }
            >
              <div
                className="group-color"
                style={{ backgroundColor: group.color }}
              />
              <div className="group-info">
                <span className="group-name">{group.name}</span>
                <span className="group-count">
                  {group.featureIds.size} features
                </span>
              </div>
              <button
                className="delete-group-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSelectionGroup(group.id);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="selection-help">
        <p>
          <strong>Tip:</strong> Hold <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> while clicking
          to multi-select features.
        </p>
      </div>
    </div>
  );
}
