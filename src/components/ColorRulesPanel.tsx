import { useState, useMemo } from 'react';
import { useMapStore } from '../store/mapStore';
import type { ColorRule } from '../types';
import { getAvailableProperties, getPropertyValues, getPropertyStats } from '../utils/dataLoader';

interface ColorRulesPanelProps {
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

const PRESET_COLORS = [
  '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
  '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5',
  '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f',
];

export function ColorRulesPanel({ layerId }: ColorRulesPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProperty, setNewProperty] = useState('');
  const [newOperator, setNewOperator] = useState<ColorRule['operator']>('equals');
  const [newValue, setNewValue] = useState('');
  const [newMinValue, setNewMinValue] = useState('');
  const [newMaxValue, setNewMaxValue] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const layer = useMapStore((s) => s.layers.find((l) => l.id === layerId));
  const { addColorRule, updateColorRule, removeColorRule, toggleColorRule } = useMapStore();

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

  const handleAddRule = () => {
    let value: ColorRule['value'];

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

    addColorRule(layerId, {
      name: newName || `${newProperty} ${newOperator} ${newValue}`,
      property: newProperty,
      operator: newOperator,
      value,
      color: newColor,
      enabled: true,
    });

    setIsAdding(false);
    setNewName('');
    setNewProperty('');
    setNewValue('');
    setNewMinValue('');
    setNewMaxValue('');
    setNewColor(PRESET_COLORS[(layer?.colorRules.length || 0) % PRESET_COLORS.length]);
  };

  if (!layer) return null;

  return (
    <div className="color-rules-panel">
      <div className="color-rules-header">
        <span>Color features based on conditions</span>
        <button
          className="add-rule-btn"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? 'Cancel' : '+ Add Rule'}
        </button>
      </div>

      {isAdding && (
        <div className="add-rule-form">
          <div className="form-row">
            <input
              type="text"
              placeholder="Rule name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

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
              onChange={(e) => setNewOperator(e.target.value as ColorRule['operator'])}
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
                  list={`color-values-${layerId}`}
                />
                <datalist id={`color-values-${layerId}`}>
                  {propertyValues.slice(0, 50).map((v) => (
                    <option key={String(v)} value={String(v)} />
                  ))}
                </datalist>
              </>
            )}
          </div>

          <div className="form-row color-picker-row">
            <label>Color:</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
            <div className="preset-colors">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-preset ${newColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewColor(color)}
                />
              ))}
            </div>
          </div>

          <button
            className="apply-rule-btn"
            onClick={handleAddRule}
            disabled={!newProperty || (!newValue && newOperator !== 'between')}
          >
            Add Color Rule
          </button>
        </div>
      )}

      <div className="rules-list">
        {layer.colorRules.length === 0 ? (
          <p className="no-rules">No color rules defined</p>
        ) : (
          layer.colorRules.map((rule) => (
            <div
              key={rule.id}
              className={`rule-item ${!rule.enabled ? 'disabled' : ''}`}
            >
              <div className="rule-color" style={{ backgroundColor: rule.color }} />
              <label className="rule-toggle">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleColorRule(layerId, rule.id)}
                />
                <span className="rule-description">
                  <strong>{rule.name}</strong>
                  <br />
                  <small>
                    {rule.property} {rule.operator}{' '}
                    {Array.isArray(rule.value)
                      ? rule.value.join(rule.operator === 'between' ? ' - ' : ', ')
                      : String(rule.value)}
                  </small>
                </span>
              </label>
              <input
                type="color"
                value={rule.color}
                onChange={(e) =>
                  updateColorRule(layerId, rule.id, { color: e.target.value })
                }
                className="rule-color-picker"
              />
              <button
                className="remove-rule-btn"
                onClick={() => removeColorRule(layerId, rule.id)}
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
