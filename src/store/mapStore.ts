import { create } from 'zustand';
import type { FeatureCollection } from 'geojson';
import type {
  GeoLayer,
  MapState,
  SelectionGroup,
  LayerStyle,
  FilterRule,
  ColorRule,
} from '../types';
import { WESTERN_US_CENTER } from '../types';

interface MapStore {
  // State
  layers: GeoLayer[];
  mapState: MapState;
  selectionGroups: SelectionGroup[];
  activeSelectionGroupId: string | null;
  isDrawingMode: boolean;
  searchQuery: string;
  hoveredFeatureId: string | null;

  // Layer actions
  addLayer: (layer: Omit<GeoLayer, 'id'> & { id?: string }) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<GeoLayer>) => void;
  setLayerData: (layerId: string, data: FeatureCollection) => void;
  setLayerLoading: (layerId: string, loading: boolean) => void;
  setLayerError: (layerId: string, error: string | null) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerStyle: (layerId: string, style: Partial<LayerStyle>) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // Filter actions
  addFilter: (layerId: string, filter: Omit<FilterRule, 'id'>) => void;
  updateFilter: (layerId: string, filterId: string, updates: Partial<FilterRule>) => void;
  removeFilter: (layerId: string, filterId: string) => void;
  toggleFilter: (layerId: string, filterId: string) => void;

  // Color rule actions
  addColorRule: (layerId: string, rule: Omit<ColorRule, 'id'>) => void;
  updateColorRule: (layerId: string, ruleId: string, updates: Partial<ColorRule>) => void;
  removeColorRule: (layerId: string, ruleId: string) => void;
  toggleColorRule: (layerId: string, ruleId: string) => void;

  // Selection actions
  selectFeature: (layerId: string, featureId: string, addToSelection?: boolean) => void;
  deselectFeature: (layerId: string, featureId: string) => void;
  clearSelection: (layerId?: string) => void;
  selectFeaturesInBounds: (layerId: string, bounds: [[number, number], [number, number]]) => void;

  // Selection group actions
  createSelectionGroup: (name: string, color: string) => string;
  deleteSelectionGroup: (groupId: string) => void;
  setActiveSelectionGroup: (groupId: string | null) => void;
  addToSelectionGroup: (groupId: string, layerId: string, featureIds: string[]) => void;
  removeFromSelectionGroup: (groupId: string, featureIds: string[]) => void;

  // Map state actions
  setMapState: (state: Partial<MapState>) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;

  // UI actions
  setDrawingMode: (enabled: boolean) => void;
  setSearchQuery: (query: string) => void;
  setHoveredFeature: (featureId: string | null) => void;

  // Utility
  getFilteredFeatures: (layerId: string) => FeatureCollection | null;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultLayerStyle: LayerStyle = {
  fillColor: '#3388ff',
  fillOpacity: 0.3,
  strokeColor: '#3388ff',
  strokeWidth: 1,
  strokeOpacity: 0.8,
};

export const useMapStore = create<MapStore>((set, get) => ({
  // Initial state
  layers: [],
  mapState: {
    center: WESTERN_US_CENTER,
    zoom: 5,
    bounds: null,
  },
  selectionGroups: [],
  activeSelectionGroupId: null,
  isDrawingMode: false,
  searchQuery: '',
  hoveredFeatureId: null,

  // Layer actions
  addLayer: (layer) => {
    const newLayer: GeoLayer = {
      id: layer.id || generateId(),
      name: layer.name,
      type: layer.type,
      visible: layer.visible ?? true,
      data: layer.data || null,
      loading: layer.loading ?? false,
      error: layer.error || null,
      style: layer.style || { ...defaultLayerStyle },
      filters: layer.filters || [],
      colorRules: layer.colorRules || [],
      selectedFeatures: layer.selectedFeatures || new Set(),
      opacity: layer.opacity ?? 1,
      zIndex: layer.zIndex ?? get().layers.length,
    };
    set((state) => ({ layers: [...state.layers, newLayer] }));
  },

  removeLayer: (layerId) => {
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== layerId),
    }));
  },

  updateLayer: (layerId, updates) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, ...updates } : l
      ),
    }));
  },

  setLayerData: (layerId, data) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, data, loading: false, error: null } : l
      ),
    }));
  },

  setLayerLoading: (layerId, loading) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, loading } : l
      ),
    }));
  },

  setLayerError: (layerId, error) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, error, loading: false } : l
      ),
    }));
  },

  toggleLayerVisibility: (layerId) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    }));
  },

  setLayerStyle: (layerId, style) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, style: { ...l.style, ...style } } : l
      ),
    }));
  },

  setLayerOpacity: (layerId, opacity) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, opacity } : l
      ),
    }));
  },

  reorderLayers: (fromIndex, toIndex) => {
    set((state) => {
      const newLayers = [...state.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return {
        layers: newLayers.map((l, i) => ({ ...l, zIndex: i })),
      };
    });
  },

  // Filter actions
  addFilter: (layerId, filter) => {
    const newFilter: FilterRule = {
      id: generateId(),
      ...filter,
    };
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, filters: [...l.filters, newFilter] } : l
      ),
    }));
  },

  updateFilter: (layerId, filterId, updates) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId
          ? {
              ...l,
              filters: l.filters.map((f) =>
                f.id === filterId ? { ...f, ...updates } : f
              ),
            }
          : l
      ),
    }));
  },

  removeFilter: (layerId, filterId) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId
          ? { ...l, filters: l.filters.filter((f) => f.id !== filterId) }
          : l
      ),
    }));
  },

  toggleFilter: (layerId, filterId) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId
          ? {
              ...l,
              filters: l.filters.map((f) =>
                f.id === filterId ? { ...f, enabled: !f.enabled } : f
              ),
            }
          : l
      ),
    }));
  },

  // Color rule actions
  addColorRule: (layerId, rule) => {
    const newRule: ColorRule = {
      id: generateId(),
      ...rule,
    };
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, colorRules: [...l.colorRules, newRule] } : l
      ),
    }));
  },

  updateColorRule: (layerId, ruleId, updates) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId
          ? {
              ...l,
              colorRules: l.colorRules.map((r) =>
                r.id === ruleId ? { ...r, ...updates } : r
              ),
            }
          : l
      ),
    }));
  },

  removeColorRule: (layerId, ruleId) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId
          ? { ...l, colorRules: l.colorRules.filter((r) => r.id !== ruleId) }
          : l
      ),
    }));
  },

  toggleColorRule: (layerId, ruleId) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId
          ? {
              ...l,
              colorRules: l.colorRules.map((r) =>
                r.id === ruleId ? { ...r, enabled: !r.enabled } : r
              ),
            }
          : l
      ),
    }));
  },

  // Selection actions
  selectFeature: (layerId, featureId, addToSelection = false) => {
    set((state) => ({
      layers: state.layers.map((l) => {
        if (l.id !== layerId) return l;
        const newSelected = addToSelection
          ? new Set(l.selectedFeatures)
          : new Set<string>();
        newSelected.add(featureId);
        return { ...l, selectedFeatures: newSelected };
      }),
    }));

    // Add to active selection group if one is active
    const { activeSelectionGroupId } = get();
    if (activeSelectionGroupId) {
      get().addToSelectionGroup(activeSelectionGroupId, layerId, [featureId]);
    }
  },

  deselectFeature: (layerId, featureId) => {
    set((state) => ({
      layers: state.layers.map((l) => {
        if (l.id !== layerId) return l;
        const newSelected = new Set(l.selectedFeatures);
        newSelected.delete(featureId);
        return { ...l, selectedFeatures: newSelected };
      }),
    }));
  },

  clearSelection: (layerId) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        !layerId || l.id === layerId
          ? { ...l, selectedFeatures: new Set<string>() }
          : l
      ),
    }));
  },

  selectFeaturesInBounds: (_layerId, _bounds) => {
    // Implementation requires turf for spatial queries
    // Will be implemented in component
  },

  // Selection group actions
  createSelectionGroup: (name, color) => {
    const id = generateId();
    const newGroup: SelectionGroup = {
      id,
      name,
      color,
      featureIds: new Set(),
      layerIds: [],
    };
    set((state) => ({
      selectionGroups: [...state.selectionGroups, newGroup],
      activeSelectionGroupId: id,
    }));
    return id;
  },

  deleteSelectionGroup: (groupId) => {
    set((state) => ({
      selectionGroups: state.selectionGroups.filter((g) => g.id !== groupId),
      activeSelectionGroupId:
        state.activeSelectionGroupId === groupId
          ? null
          : state.activeSelectionGroupId,
    }));
  },

  setActiveSelectionGroup: (groupId) => {
    set({ activeSelectionGroupId: groupId });
  },

  addToSelectionGroup: (groupId, layerId, featureIds) => {
    set((state) => ({
      selectionGroups: state.selectionGroups.map((g) => {
        if (g.id !== groupId) return g;
        const newFeatureIds = new Set(g.featureIds);
        featureIds.forEach((id) => newFeatureIds.add(id));
        const newLayerIds = g.layerIds.includes(layerId)
          ? g.layerIds
          : [...g.layerIds, layerId];
        return { ...g, featureIds: newFeatureIds, layerIds: newLayerIds };
      }),
    }));
  },

  removeFromSelectionGroup: (groupId, featureIds) => {
    set((state) => ({
      selectionGroups: state.selectionGroups.map((g) => {
        if (g.id !== groupId) return g;
        const newFeatureIds = new Set(g.featureIds);
        featureIds.forEach((id) => newFeatureIds.delete(id));
        return { ...g, featureIds: newFeatureIds };
      }),
    }));
  },

  // Map state actions
  setMapState: (state) => {
    set((s) => ({ mapState: { ...s.mapState, ...state } }));
  },

  setCenter: (center) => {
    set((state) => ({ mapState: { ...state.mapState, center } }));
  },

  setZoom: (zoom) => {
    set((state) => ({ mapState: { ...state.mapState, zoom } }));
  },

  // UI actions
  setDrawingMode: (enabled) => {
    set({ isDrawingMode: enabled });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  setHoveredFeature: (featureId) => {
    set({ hoveredFeatureId: featureId });
  },

  // Utility
  getFilteredFeatures: (layerId) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer?.data) return null;

    const enabledFilters = layer.filters.filter((f) => f.enabled);
    if (enabledFilters.length === 0) return layer.data;

    const filteredFeatures = layer.data.features.filter((feature) => {
      return enabledFilters.every((filter) => {
        const propValue = feature.properties?.[filter.property];
        if (propValue === undefined) return false;

        switch (filter.operator) {
          case 'equals':
            return propValue === filter.value;
          case 'contains':
            return String(propValue)
              .toLowerCase()
              .includes(String(filter.value).toLowerCase());
          case 'greater':
            return Number(propValue) > Number(filter.value);
          case 'less':
            return Number(propValue) < Number(filter.value);
          case 'between':
            const [min, max] = filter.value as [number, number];
            return Number(propValue) >= min && Number(propValue) <= max;
          case 'in':
            return (filter.value as string[]).includes(String(propValue));
          default:
            return true;
        }
      });
    });

    return {
      type: 'FeatureCollection' as const,
      features: filteredFeatures,
    };
  },
}));
