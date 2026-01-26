import { useState } from 'react';
import { MapView } from './components/MapView';
import { LayerPanel } from './components/LayerPanel';
import { SelectionGroupsPanel } from './components/SelectionGroupsPanel';
import { SearchPanel } from './components/SearchPanel';
import './App.css';

type SidebarTab = 'layers' | 'selections';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('layers');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Western US Geography Explorer</h1>
        <p className="subtitle">Overlay and analyze geographic boundaries</p>
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
              className={activeTab === 'selections' ? 'active' : ''}
              onClick={() => setActiveTab('selections')}
            >
              Selections
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'layers' && <LayerPanel />}
            {activeTab === 'selections' && <SelectionGroupsPanel />}
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
        <span>Tip: Add layers to start exploring. Use filters and color rules to highlight specific areas.</span>
        <span className="data-attribution">
          Data: US Census Bureau, NPS, OpenStreetMap contributors
        </span>
      </footer>
    </div>
  );
}

export default App;
