import { useState, useMemo } from 'react';
import { useMapStore } from '../store/mapStore';
import type { FilterRule } from '../types';
import { getAvailableProperties, getPropertyValues, getPropertyStats } from '../utils/dataLoader';

interface FilterPanelProps {
  layerId: string;
}

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater', label: 'Greater than' },
  { value: 'less', label: 'Less than' },
  { value: 'between', label: 'Between' },
  { value: 'in', label: 'In list' },
];

export function FilterPanel({ layerId }: FilterPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newProperty, setNewProperty] = useState('');
  const [newOperator, setNewOperator] = useState<FilterRule['operator']>('equals');
  const [newValue, setNewValue] = useState('');
  const [newMinValue, setNewMinValue] = useState('');
  const [newMaxValue, setNewMaxValue] = useState('');

  const layer = useMapStore((s) => s.layers.find((l) => l.id === layerId));
  const { addFilter, removeFilter, toggleFilter } = useMapStore();

  const availableProperties = useMemo(() => {
    if (!layer?.data) return [];
    return getAvailableProperties(layer.data);
  }, [layer?.data]);

  const propertyValues = useMemo(() => {
    if (!layer?.data || !newProperty) return [];
    return getPropertyValues(layer.data, newProperty);
  }, [layer?.data, newProperty]);

  const propertyStats = useMemo(() => {
    if (!layer?.data || !newProperty) return null;
    return getPropertyStats(layer.data, newProperty);
  }, [layer?.data, newProperty]);

  const handleAddFilter = () => {
    let value: FilterRule['value'];

    switch (newOperator) {
      case 'between':
        value = [parseFloat(newMinValue) || 0, parseFloat(newMaxValue) || 0];
        break;
      case 'in':
        value = newValue.split(',').map((v) => v.trim());
        break;
      case 'greater':
      case 'less':
        value = parseFloat(newValue) || 0;
        break;
      default:
        value = newValue;
    }

    addFilter(layerId, {
      property: newProperty,
      operator: newOperator,
      value,
      enabled: true,
    });

    setIsAdding(false);
    setNewProperty('');
    setNewValue('');
    setNewMinValue('');
    setNewMaxValue('');
  };

  if (!layer) return null;

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <span>Filter features by property values</span>
        <button
          className="add-filter-btn"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? 'Cancel' : '+ Add Filter'}
        </button>
      </div>

      {isAdding && (
        <div className="add-filter-form">
          <div className="form-row">
            <select
              value={newProperty}
              onChange={(e) => setNewProperty(e.target.value)}
            >
              <option value="">Select property...</option>
              {availableProperties.map((prop) => (
                <option key={prop} value={prop}>
                  {prop}
                </option>
              ))}
            </select>

            <select
              value={newOperator}
              onChange={(e) => setNewOperator(e.target.value as FilterRule['operator'])}
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {propertyStats && (
            <div className="property-stats">
              Range: {propertyStats.min} - {propertyStats.max}
              (avg: {propertyStats.avg.toFixed(2)})
            </div>
          )}

          <div className="form-row">
            {newOperator === 'between' ? (
              <>
                <input
                  type="number"
                  placeholder="Min"
                  value={newMinValue}
                  onChange={(e) => setNewMinValue(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={newMaxValue}
                  onChange={(e) => setNewMaxValue(e.target.value)}
                />
              </>
            ) : newOperator === 'in' ? (
              <input
                type="text"
                placeholder="Value1, Value2, ..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  list={`values-${layerId}`}
                />
                <datalist id={`values-${layerId}`}>
                  {propertyValues.slice(0, 50).map((v) => (
                    <option key={String(v)} value={String(v)} />
                  ))}
                </datalist>
              </>
            )}
          </div>

          <button
            className="apply-filter-btn"
            onClick={handleAddFilter}
            disabled={!newProperty || (!newValue && newOperator !== 'between')}
          >
            Add Filter
          </button>
        </div>
      )}

      <div className="filters-list">
        {layer.filters.length === 0 ? (
          <p className="no-filters">No filters applied</p>
        ) : (
          layer.filters.map((filter) => (
            <div
              key={filter.id}
              className={`filter-item ${!filter.enabled ? 'disabled' : ''}`}
            >
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={filter.enabled}
                  onChange={() => toggleFilter(layerId, filter.id)}
                />
                <span className="filter-description">
                  <strong>{filter.property}</strong> {filter.operator}{' '}
                  {Array.isArray(filter.value)
                    ? filter.value.join(filter.operator === 'between' ? ' - ' : ', ')
                    : String(filter.value)}
                </span>
              </label>
              <button
                className="remove-filter-btn"
                onClick={() => removeFilter(layerId, filter.id)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
