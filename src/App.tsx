import { useState } from 'react';
import { MapView } from './components/MapView';
import { LayerPanel } from './components/LayerPanel';
import { BTMEFiltersPanel } from './components/BTMEFiltersPanel';
import { SearchAreaPanel } from './components/SearchAreaPanel';
import { ClueTrackerPanel } from './components/ClueTrackerPanel';
import { GeometryToolsPanel } from './components/GeometryToolsPanel';
import { SearchPanel } from './components/SearchPanel';
import './App.css';

type SidebarTab = 'layers' | 'filters' | 'geometry' | 'clues' | 'search';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('layers');

  return (
    <div className="app">
      <header className="app-header">
        <h1>BTME Map Explorer</h1>
        <p className="subtitle">Beyond The Map's Edge - Western US Geography Analysis</p>
        <SearchPanel />
      </header>

      <div className="app-content">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-tabs">
            <button
              className={activeTab === 'layers' ? 'active' : ''}
              onClick={() => setActiveTab('layers')}
              title="Add and manage map layers"
            >
              Layers
            </button>
            <button
              className={activeTab === 'filters' ? 'active' : ''}
              onClick={() => setActiveTab('filters')}
              title="Apply BTME hunt filters"
            >
              Filters
            </button>
            <button
              className={activeTab === 'geometry' ? 'active' : ''}
              onClick={() => setActiveTab('geometry')}
              title="Geometry and bearing tools"
            >
              Geo
            </button>
            <button
              className={activeTab === 'clues' ? 'active' : ''}
              onClick={() => setActiveTab('clues')}
              title="Track poem clues sequentially"
            >
              Clues
            </button>
            <button
              className={activeTab === 'search' ? 'active' : ''}
              onClick={() => setActiveTab('search')}
              title="Track searched areas"
            >
              Areas
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'layers' && <LayerPanel />}
            {activeTab === 'filters' && <BTMEFiltersPanel />}
            {activeTab === 'geometry' && <GeometryToolsPanel />}
            {activeTab === 'clues' && <ClueTrackerPanel />}
            {activeTab === 'search' && <SearchAreaPanel />}
          </div>

          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </aside>

        <main className="map-area">
          <MapView />
        </main>
      </div>

      <footer className="app-footer">
        <span>Tip: Use Layers for data, Filters for constraints, Geo for bearings, Clues to track the poem sequence.</span>
        <span className="data-attribution">
          Data: NPS, USFS, BLM, GNIS, OpenStreetMap | Not affiliated with BTME
        </span>
      </footer>
    </div>
  );
}

export default App;
