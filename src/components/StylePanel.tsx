import { useMapStore } from '../store/mapStore';

interface StylePanelProps {
  layerId: string;
}

export function StylePanel({ layerId }: StylePanelProps) {
  const layer = useMapStore((s) => s.layers.find((l) => l.id === layerId));
  const { setLayerStyle } = useMapStore();

  if (!layer) return null;

  return (
    <div className="style-panel">
      <div className="style-section">
        <h4>Fill</h4>
        <div className="style-row">
          <label>Color</label>
          <input
            type="color"
            value={layer.style.fillColor}
            onChange={(e) => setLayerStyle(layerId, { fillColor: e.target.value })}
          />
        </div>
        <div className="style-row">
          <label>Opacity: {Math.round(layer.style.fillOpacity * 100)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layer.style.fillOpacity}
            onChange={(e) =>
              setLayerStyle(layerId, { fillOpacity: parseFloat(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="style-section">
        <h4>Stroke</h4>
        <div className="style-row">
          <label>Color</label>
          <input
            type="color"
            value={layer.style.strokeColor}
            onChange={(e) => setLayerStyle(layerId, { strokeColor: e.target.value })}
          />
        </div>
        <div className="style-row">
          <label>Width: {layer.style.strokeWidth}px</label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={layer.style.strokeWidth}
            onChange={(e) =>
              setLayerStyle(layerId, { strokeWidth: parseFloat(e.target.value) })
            }
          />
        </div>
        <div className="style-row">
          <label>Opacity: {Math.round(layer.style.strokeOpacity * 100)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layer.style.strokeOpacity}
            onChange={(e) =>
              setLayerStyle(layerId, { strokeOpacity: parseFloat(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="style-presets">
        <h4>Quick Presets</h4>
        <div className="preset-buttons">
          <button
            onClick={() =>
              setLayerStyle(layerId, {
                fillColor: '#3388ff',
                fillOpacity: 0.3,
                strokeColor: '#3388ff',
                strokeWidth: 1,
                strokeOpacity: 0.8,
              })
            }
          >
            Default Blue
          </button>
          <button
            onClick={() =>
              setLayerStyle(layerId, {
                fillColor: '#ff6b6b',
                fillOpacity: 0.4,
                strokeColor: '#c92a2a',
                strokeWidth: 1,
                strokeOpacity: 0.9,
              })
            }
          >
            Highlight Red
          </button>
          <button
            onClick={() =>
              setLayerStyle(layerId, {
                fillColor: '#51cf66',
                fillOpacity: 0.35,
                strokeColor: '#2f9e44',
                strokeWidth: 1,
                strokeOpacity: 0.8,
              })
            }
          >
            Nature Green
          </button>
          <button
            onClick={() =>
              setLayerStyle(layerId, {
                fillColor: '#fcc419',
                fillOpacity: 0.4,
                strokeColor: '#f59f00',
                strokeWidth: 1.5,
                strokeOpacity: 0.9,
              })
            }
          >
            Attention Yellow
          </button>
          <button
            onClick={() =>
              setLayerStyle(layerId, {
                fillColor: 'transparent',
                fillOpacity: 0,
                strokeColor: '#212529',
                strokeWidth: 2,
                strokeOpacity: 1,
              })
            }
          >
            Outline Only
          </button>
        </div>
      </div>
    </div>
  );
}
