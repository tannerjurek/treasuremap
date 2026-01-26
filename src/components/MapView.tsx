import { useCallback, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet';
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet';
import type { Feature, GeoJsonProperties, Geometry } from 'geojson';
import { useMapStore } from '../store/mapStore';
// Types are imported via mapStore
import 'leaflet/dist/leaflet.css';

// Map controller component for syncing state
function MapController() {
  const map = useMap();
  const { setMapState } = useMapStore();

  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      setMapState({
        center: [center.lat, center.lng],
        zoom,
        bounds: [
          [bounds.getSouth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getEast()],
        ],
      });
    },
  });

  return null;
}

// Layer rendering component
function GeoLayer({ layerId }: { layerId: string }) {
  const layer = useMapStore((s) => s.layers.find((l) => l.id === layerId));
  const selectionGroups = useMapStore((s) => s.selectionGroups);
  const hoveredFeatureId = useMapStore((s) => s.hoveredFeatureId);
  const {
    selectFeature,
    deselectFeature,
    setHoveredFeature,
    getFilteredFeatures,
  } = useMapStore();

  const data = useMemo(() => {
    if (!layer) return null;
    return getFilteredFeatures(layerId);
  }, [layer, layerId, getFilteredFeatures]);

  const getFeatureColor = useCallback(
    (feature: Feature): string => {
      if (!layer || !feature.properties) return layer?.style.fillColor || '#3388ff';

      const featureId = feature.properties._featureId;

      // Check selection groups first
      for (const group of selectionGroups) {
        if (group.featureIds.has(featureId)) {
          return group.color;
        }
      }

      // Check if selected
      if (layer.selectedFeatures.has(featureId)) {
        return '#ff7800';
      }

      // Check color rules
      for (const rule of layer.colorRules) {
        if (!rule.enabled) continue;

        const propValue = feature.properties[rule.property];
        if (propValue === undefined) continue;

        let matches = false;
        switch (rule.operator) {
          case 'equals':
            matches = propValue === rule.value;
            break;
          case 'contains':
            matches = String(propValue)
              .toLowerCase()
              .includes(String(rule.value).toLowerCase());
            break;
          case 'greater':
            matches = Number(propValue) > Number(rule.value);
            break;
          case 'less':
            matches = Number(propValue) < Number(rule.value);
            break;
          case 'between':
            const [min, max] = rule.value as [number, number];
            matches = Number(propValue) >= min && Number(propValue) <= max;
            break;
          case 'in':
            matches = (rule.value as string[]).includes(String(propValue));
            break;
        }

        if (matches) {
          return rule.color;
        }
      }

      return layer.style.fillColor;
    },
    [layer, selectionGroups]
  );

  const style = useCallback(
    (feature?: Feature<Geometry, GeoJsonProperties>): PathOptions => {
      if (!layer || !feature) {
        return {};
      }

      const featureId = feature.properties?._featureId;
      const isHovered = featureId === hoveredFeatureId;
      const isSelected = layer.selectedFeatures.has(featureId);

      return {
        fillColor: getFeatureColor(feature),
        fillOpacity: layer.style.fillOpacity * layer.opacity * (isHovered ? 1.2 : 1),
        color: isSelected || isHovered ? '#ff7800' : layer.style.strokeColor,
        weight: isSelected || isHovered ? 3 : layer.style.strokeWidth,
        opacity: layer.style.strokeOpacity,
      };
    },
    [layer, hoveredFeatureId, getFeatureColor]
  );

  const onEachFeature = useCallback(
    (feature: Feature, leafletLayer: Layer) => {
      const featureId = feature.properties?._featureId;
      if (!featureId || !layer) return;

      leafletLayer.on({
        click: (e: LeafletMouseEvent) => {
          const isMultiSelect = e.originalEvent.ctrlKey || e.originalEvent.metaKey;
          if (layer.selectedFeatures.has(featureId) && isMultiSelect) {
            deselectFeature(layerId, featureId);
          } else {
            selectFeature(layerId, featureId, isMultiSelect);
          }
        },
        mouseover: () => {
          setHoveredFeature(featureId);
        },
        mouseout: () => {
          setHoveredFeature(null);
        },
      });

      // Build popup content
      const props = feature.properties || {};
      const popupContent = Object.entries(props)
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
        .join('<br/>');

      leafletLayer.bindPopup(popupContent, {
        maxWidth: 300,
        maxHeight: 200,
      });

      // Tooltip with name if available
      const name = props.NAME || props.name || props.ZCTA || props.UNIT_NAME;
      if (name) {
        leafletLayer.bindTooltip(String(name), {
          sticky: true,
          direction: 'top',
        });
      }
    },
    [layer, layerId, selectFeature, deselectFeature, setHoveredFeature]
  );

  if (!layer || !layer.visible || !data || data.features.length === 0) {
    return null;
  }

  return (
    <GeoJSON
      key={`${layerId}-${JSON.stringify(layer.filters)}-${JSON.stringify(layer.colorRules)}`}
      data={data}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

export function MapView() {
  const layers = useMapStore((s) => s.layers);
  const mapState = useMapStore((s) => s.mapState);

  // Sort layers by zIndex for proper rendering order
  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.zIndex - b.zIndex),
    [layers]
  );

  return (
    <div className="map-container">
      <MapContainer
        center={mapState.center}
        zoom={mapState.zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        maxBounds={[
          [20, -180],
          [72, -60],
        ]}
        minZoom={3}
        maxZoom={18}
      >
        <ZoomControl position="bottomright" />
        <MapController />

        {/* Base map tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Alternative: Satellite view */}
        {/* <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri"
        /> */}

        {/* Render all visible layers */}
        {sortedLayers.map((layer) => (
          <GeoLayer key={layer.id} layerId={layer.id} />
        ))}
      </MapContainer>
    </div>
  );
}
