# Western US Geography Explorer

An interactive map application for visualizing, filtering, and analyzing geographic boundaries across the western United States. Overlay multiple geography types, apply custom colors based on attributes, and filter areas based on specific qualities.

## Features

### Multi-Layer Geography System
- **State Boundaries** - Western US state outlines
- **ZIP Codes** - Postal code areas (sample data included, real data can be loaded)
- **National Parks** - NPS boundary data
- **National Forests** - USFS land boundaries
- **BLM Land** - Bureau of Land Management areas
- **Census Tracts** - Detailed census geography
- **Tribal Lands** - Native American reservations
- **Wilderness Areas** - Designated wilderness regions
- **Custom GeoJSON** - Upload your own geographic data

### Color Rules Engine
Apply colors to features based on property conditions:
- **Equals** - Exact match
- **Contains** - Text search
- **Greater/Less than** - Numeric comparisons
- **Between** - Range filters
- **In list** - Multiple value matching

Example: Color all ZIP codes with population > 50,000 in red, or highlight specific state names in green.

### Filtering System
Hide/show features based on attribute values:
- Filter by any property in your data
- Combine multiple filters
- Toggle filters on/off
- See property statistics (min, max, avg) while filtering

### Selection Groups
Create named groups to organize selections:
- Group features from multiple layers together
- Assign consistent colors to groups
- Ctrl/Cmd+click for multi-select
- Track selection counts

### Style Customization
- Adjust fill color and opacity
- Configure stroke width and color
- Quick style presets
- Per-layer opacity control

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Quick Start

1. Click **"+ Add Layer"** in the sidebar
2. Select a layer type (e.g., "State Boundaries")
3. Click **"Create Layer"**
4. Expand the layer to access:
   - **Filters** - Hide features by property values
   - **Colors** - Apply conditional coloring
   - **Style** - Customize appearance

### Loading Your Own Data

1. Select **"Custom GeoJSON"** as the layer type
2. Either:
   - Upload a `.json` or `.geojson` file
   - Enter a URL to a GeoJSON endpoint
3. Your data will be loaded with all properties available for filtering/coloring

## Data Sources

The application can load geographic data from various sources:

- **US Census Bureau** - State boundaries, ZIP code tabulation areas
- **National Park Service** - Park boundaries
- **ArcGIS REST Services** - Various public geographic datasets
- **Custom uploads** - Any valid GeoJSON file

## Architecture

```
src/
├── components/
│   ├── MapView.tsx        # Leaflet map container
│   ├── LayerPanel.tsx     # Layer management UI
│   ├── FilterPanel.tsx    # Attribute filtering
│   ├── ColorRulesPanel.tsx # Conditional coloring
│   ├── StylePanel.tsx     # Visual styling controls
│   ├── SelectionGroupsPanel.tsx # Selection management
│   └── SearchPanel.tsx    # Feature search
├── store/
│   └── mapStore.ts        # Zustand state management
├── types/
│   └── index.ts           # TypeScript definitions
└── utils/
    └── dataLoader.ts      # Data fetching utilities
```

### Tech Stack
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Leaflet + react-leaflet** - Interactive mapping
- **Zustand** - State management
- **Turf.js** - Geospatial analysis

## Usage Examples

### Highlight ZIP codes by population
1. Add a ZIP Codes layer
2. Go to **Colors** tab
3. Add rule: `population` > `25000` → Red
4. Add rule: `population` < `10000` → Blue

### Filter to urban areas only
1. Expand layer and go to **Filters** tab
2. Add filter: `urbanRural` equals `urban`

### Create a selection group for analysis
1. Switch to **Selections** tab
2. Create a new group (e.g., "Target Markets")
3. Click on features to add them to the group
4. All grouped features will share the same color

## License

MIT
