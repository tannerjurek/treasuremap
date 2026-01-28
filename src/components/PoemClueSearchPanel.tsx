import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { searchByPoemClue, POEM_KEYWORDS, filterFeaturesByName } from '../utils/dataLoader';
import type { PoemClueCategory } from '../types';

const CLUE_DESCRIPTIONS: Record<PoemClueCategory, { line: string; keywords: string[] }> = {
  bear: {
    line: '"In ursa east his realm awaits"',
    keywords: POEM_KEYWORDS.bear,
  },
  bride: {
    line: '"The bride"',
    keywords: POEM_KEYWORDS.bride,
  },
  granite: {
    line: '"Double arcs on granite bold"',
    keywords: POEM_KEYWORDS.granite,
  },
  water: {
    line: '"waters\' silent flight"',
    keywords: POEM_KEYWORDS.water,
  },
  arch: {
    line: '"Double arcs"',
    keywords: POEM_KEYWORDS.arch,
  },
  face: {
    line: '"Return her face to find the place"',
    keywords: POEM_KEYWORDS.face,
  },
  hole: {
    line: '"past the hole"',
    keywords: POEM_KEYWORDS.hole,
  },
};

export function PoemClueSearchPanel() {
  const [selectedClue, setSelectedClue] = useState<PoemClueCategory | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [customKeyword, setCustomKeyword] = useState('');
  const [results, setResults] = useState<{ name: string; type: string; count: number }[]>([]);

  const { addLayer, setLayerData, setLayerError, layers } = useMapStore();

  const handleClueSearch = async (clue: PoemClueCategory) => {
    setSelectedClue(clue);
    setIsSearching(true);

    const layerId = `poem_${clue}_${Date.now()}`;
    const color = getClueColor(clue);

    addLayer({
      id: layerId,
      name: `Poem: ${clue.charAt(0).toUpperCase() + clue.slice(1)} Places`,
      type: 'place_name',
      visible: true,
      data: null,
      loading: true,
      error: null,
      style: {
        fillColor: color,
        fillOpacity: 0.7,
        strokeColor: color,
        strokeWidth: 2,
        strokeOpacity: 1,
      },
      filters: [],
      colorRules: [],
      selectedFeatures: new Set(),
      opacity: 1,
      zIndex: layers.length,
    });

    try {
      const data = await searchByPoemClue(clue);
      setLayerData(layerId, data);
      setResults(prev => [...prev, {
        name: clue,
        type: 'Poem Clue',
        count: data.features.length,
      }]);
    } catch (error) {
      setLayerError(layerId, error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCustomSearch = async () => {
    if (!customKeyword.trim()) return;

    setIsSearching(true);
    const keywords = customKeyword.split(',').map(k => k.trim());
    const layerId = `custom_search_${Date.now()}`;

    addLayer({
      id: layerId,
      name: `Search: ${customKeyword}`,
      type: 'place_name',
      visible: true,
      data: null,
      loading: true,
      error: null,
      style: {
        fillColor: '#f97316',
        fillOpacity: 0.7,
        strokeColor: '#ea580c',
        strokeWidth: 2,
        strokeOpacity: 1,
      },
      filters: [],
      colorRules: [],
      selectedFeatures: new Set(),
      opacity: 1,
      zIndex: layers.length,
    });

    try {
      const { searchPlaceNames } = await import('../utils/dataLoader');
      const data = await searchPlaceNames(keywords);
      setLayerData(layerId, data);
      setResults(prev => [...prev, {
        name: customKeyword,
        type: 'Custom',
        count: data.features.length,
      }]);
      setCustomKeyword('');
    } catch (error) {
      setLayerError(layerId, error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilterExisting = (clue: PoemClueCategory) => {
    // Filter existing layers by poem keywords
    const keywords = POEM_KEYWORDS[clue];
    layers.forEach(layer => {
      if (layer.data && layer.data.features.length > 0) {
        const filtered = filterFeaturesByName(layer.data, keywords);
        if (filtered.features.length > 0) {
          setResults(prev => [...prev, {
            name: `${layer.name} (${clue})`,
            type: 'Filtered',
            count: filtered.features.length,
          }]);
        }
      }
    });
  };

  return (
    <div className="poem-clue-panel">
      <div className="panel-section">
        <h4>Search by Poem Clue</h4>
        <p className="section-description">
          Find places matching keywords from the BTME poem
        </p>
      </div>

      <div className="clue-buttons">
        {(Object.keys(CLUE_DESCRIPTIONS) as PoemClueCategory[]).map(clue => (
          <button
            key={clue}
            className={`clue-btn ${selectedClue === clue ? 'active' : ''}`}
            onClick={() => handleClueSearch(clue)}
            disabled={isSearching}
            style={{ borderLeftColor: getClueColor(clue) }}
          >
            <span className="clue-name">{clue.charAt(0).toUpperCase() + clue.slice(1)}</span>
            <span className="clue-line">{CLUE_DESCRIPTIONS[clue].line}</span>
            <span className="clue-keywords">
              {CLUE_DESCRIPTIONS[clue].keywords.join(', ')}
            </span>
          </button>
        ))}
      </div>

      <div className="panel-section">
        <h4>Custom Keyword Search</h4>
        <div className="custom-search">
          <input
            type="text"
            value={customKeyword}
            onChange={(e) => setCustomKeyword(e.target.value)}
            placeholder="Enter keywords (comma-separated)"
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
          />
          <button
            className="search-btn"
            onClick={handleCustomSearch}
            disabled={isSearching || !customKeyword.trim()}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="panel-section">
          <h4>Recent Searches</h4>
          <div className="search-results-list">
            {results.slice(-5).reverse().map((result, i) => (
              <div key={i} className="result-item">
                <span className="result-name">{result.name}</span>
                <span className="result-count">{result.count} found</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getClueColor(clue: PoemClueCategory): string {
  const colors: Record<PoemClueCategory, string> = {
    bear: '#92400e',    // Brown
    bride: '#db2777',   // Pink
    granite: '#6b7280', // Gray
    water: '#0ea5e9',   // Blue
    arch: '#7c3aed',    // Purple
    face: '#059669',    // Green
    hole: '#1f2937',    // Dark
  };
  return colors[clue];
}
