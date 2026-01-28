import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './ErrorBoundary'
import './index.css'
import App from './App.tsx'

// Extend window interface for app loading flag
declare global {
  interface Window {
    __appLoaded?: boolean;
  }
}

console.log('[Boot] main.tsx module loaded');

try {
  const rootElement = document.getElementById('root');
  console.log('[Boot] Root element:', rootElement);

  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('[Boot] Creating React root...');
  const root = createRoot(rootElement);

  console.log('[Boot] Rendering app...');
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );

  // Signal that app has loaded successfully
  window.__appLoaded = true;
  console.log('[Boot] Render call completed, app loaded');
} catch (error) {
  console.error('[Boot] Fatal error during initialization:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; background: #1a1a2e; color: #e4e4e7; min-height: 100vh; font-family: sans-serif;">
        <h1 style="color: #dc3545;">Fatal Error</h1>
        <p>The application failed to initialize.</p>
        <pre style="background: #0f3460; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
        <p style="margin-top: 20px; color: #a1a1aa;">Try refreshing the page or clearing your browser cache.</p>
      </div>
    `;
  }
}
