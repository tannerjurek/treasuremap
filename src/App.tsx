import { useState } from 'react';
import { MapView } from './components/MapView';
import { LayerPanel } from './components/LayerPanel';
import { BTMEFiltersPanel } from './components/BTMEFiltersPanel';
import { SearchAreaPanel } from './components/SearchAreaPanel';
import { PoemClueSearchPanel } from './components/PoemClueSearchPanel';
import { SearchPanel } from './components/SearchPanel';
import './App.css';

type SidebarTab = 'layers' | 'filters' | 'clues' | 'search';

function App() {
  console.log('App component rendering');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('layers');

  // Debug: log when component mounts
  console.log('App render - activeTab:', activeTab, 'sidebarOpen:', sidebarOpen);

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
              className={activeTab === 'clues' ? 'active' : ''}
              onClick={() => setActiveTab('clues')}
              title="Search by poem clues"
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
            {activeTab === 'clues' && <PoemClueSearchPanel />}
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
        <span>Tip: Use Layers to add data, Filters to eliminate areas, Clues to search poem keywords, Areas to track progress.</span>
        <span className="data-attribution">
          Data: NPS, USFS, BLM, GNIS, OpenStreetMap | Not affiliated with BTME
        </span>
      </footer>
    </div>
  );
}

export default App;
