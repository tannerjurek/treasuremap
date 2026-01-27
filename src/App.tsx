import { useState } from 'react';
import { MapView } from './components/MapView';
import { LayerPanel } from './components/LayerPanel';
import { BTMEFiltersPanel } from './components/BTMEFiltersPanel';
import { SearchAreaPanel } from './components/SearchAreaPanel';
import { SearchPanel } from './components/SearchPanel';
import './App.css';

type SidebarTab = 'layers' | 'filters' | 'search';

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
            >
              Layers
            </button>
            <button
              className={activeTab === 'filters' ? 'active' : ''}
              onClick={() => setActiveTab('filters')}
            >
              BTME Filters
            </button>
            <button
              className={activeTab === 'search' ? 'active' : ''}
              onClick={() => setActiveTab('search')}
            >
              Search Areas
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'layers' && <LayerPanel />}
            {activeTab === 'filters' && <BTMEFiltersPanel />}
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
        <span>Tip: Add layers, apply BTME filters, and mark search areas to track your progress.</span>
        <span className="data-attribution">
          Data: NPS, USFS, BLM, OpenStreetMap | Not affiliated with BTME
        </span>
      </footer>
    </div>
  );
}

export default App;
