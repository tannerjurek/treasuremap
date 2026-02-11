import { useState, useCallback } from 'react';
import { useMapStore } from '../store/mapStore';
import {
  runSolver,
  clustersToGeoJSON,
  clusterMatchesToGeoJSON,
} from '../utils/solver';
import type { CandidateCluster, SolverProgress } from '../utils/solver';

const SCORE_COLORS = [
  { min: 60, color: '#16a34a' }, // green
  { min: 40, color: '#ca8a04' }, // yellow
  { min: 20, color: '#ea580c' }, // orange
  { min: 0, color: '#dc2626' },  // red
];

function getScoreColor(score: number): string {
  for (const { min, color } of SCORE_COLORS) {
    if (score >= min) return color;
  }
  return '#6b7280';
}

export function SolverPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SolverProgress | null>(null);
  const [results, setResults] = useState<CandidateCluster[]>([]);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const { addLayer, setLayerData, removeLayer, setCenter, setZoom } = useMapStore();

  const handleRunSolver = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    setExpandedCluster(null);

    // Clean up previous solver layers
    removeLayer('solver_results');
    removeLayer('solver_matches');

    try {
      const clusters = await runSolver((p) => setProgress(p));
      setResults(clusters);
      setHasRun(true);

      if (clusters.length > 0) {
        // Add results layer to map
        const fc = clustersToGeoJSON(clusters);
        addLayer({
          id: 'solver_results',
          name: 'Solver Results',
          type: 'custom',
          visible: true,
          data: null,
          loading: false,
          error: null,
          style: {
            fillColor: '#f59e0b',
            fillOpacity: 0.2,
            strokeColor: '#f59e0b',
            strokeWidth: 2,
            strokeOpacity: 0.8,
          },
          filters: [],
          colorRules: [],
          selectedFeatures: new Set(),
          opacity: 1,
          zIndex: 200,
        });
        setLayerData('solver_results', fc);
      }
    } catch (error) {
      console.error('Solver error:', error);
      setProgress({
        phase: 'Error',
        detail: error instanceof Error ? error.message : 'Solver failed',
        percent: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [addLayer, setLayerData, removeLayer]);

  const handleZoomToCluster = useCallback((cluster: CandidateCluster) => {
    setCenter([cluster.centerLat, cluster.centerLng]);
    setZoom(cluster.radiusMiles < 10 ? 11 : cluster.radiusMiles < 30 ? 9 : 7);
  }, [setCenter, setZoom]);

  const handleShowMatches = useCallback((cluster: CandidateCluster) => {
    // Toggle expanded state
    if (expandedCluster === cluster.id) {
      removeLayer('solver_matches');
      setExpandedCluster(null);
      return;
    }

    setExpandedCluster(cluster.id);

    // Remove old matches layer and add new one
    removeLayer('solver_matches');

    const matchFc = clusterMatchesToGeoJSON(cluster);
    addLayer({
      id: 'solver_matches',
      name: `Matches: ${cluster.label}`,
      type: 'custom',
      visible: true,
      data: null,
      loading: false,
      error: null,
      style: {
        fillColor: '#8b5cf6',
        fillOpacity: 0.9,
        strokeColor: '#7c3aed',
        strokeWidth: 2,
        strokeOpacity: 1,
      },
      filters: [],
      colorRules: [],
      selectedFeatures: new Set(),
      opacity: 1,
      zIndex: 250,
    });
    setLayerData('solver_matches', matchFc);

    handleZoomToCluster(cluster);
  }, [expandedCluster, addLayer, setLayerData, removeLayer, handleZoomToCluster]);

  const handleClearResults = useCallback(() => {
    removeLayer('solver_results');
    removeLayer('solver_matches');
    setResults([]);
    setExpandedCluster(null);
    setProgress(null);
    setHasRun(false);
  }, [removeLayer]);

  return (
    <div className="solver-panel">
      <div className="panel-section">
        <h3>Treasure Hunt Solver</h3>
        <p className="section-description">
          Automatically searches GNIS for all poem clue keywords, clusters nearby
          matches, and ranks candidate areas by how many clues they satisfy.
        </p>
      </div>

      {/* Run Solver */}
      <div className="panel-section">
        <button
          className="primary-btn full-width"
          onClick={handleRunSolver}
          disabled={isRunning}
        >
          {isRunning ? 'Solving...' : hasRun ? 'Re-Run Solver' : 'Run Solver'}
        </button>
        {hasRun && !isRunning && (
          <button
            className="secondary-btn full-width"
            onClick={handleClearResults}
            style={{ marginTop: '0.5rem' }}
          >
            Clear Results
          </button>
        )}
      </div>

      {/* Progress */}
      {progress && isRunning && (
        <div className="panel-section">
          <div className="solver-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="progress-text">
              <strong>{progress.phase}</strong>: {progress.detail}
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {hasRun && !isRunning && (
        <div className="panel-section">
          <h4>Results ({results.length} candidate areas)</h4>
          {results.length === 0 && (
            <p className="helper-text">
              No candidate areas found. Try adjusting parameters or checking
              network connectivity to GNIS.
            </p>
          )}
        </div>
      )}

      {/* Ranked Results List */}
      {results.length > 0 && !isRunning && (
        <div className="panel-section">
          <div className="solver-results-list">
            {results.slice(0, 25).map((cluster, i) => {
              const isExpanded = expandedCluster === cluster.id;
              const rank = i + 1;
              const bd = cluster.scoreBreakdown;

              return (
                <div
                  key={cluster.id}
                  className={`solver-result-item ${isExpanded ? 'expanded' : ''}`}
                >
                  {/* Header */}
                  <div
                    className="result-header"
                    onClick={() => handleShowMatches(cluster)}
                  >
                    <div className="result-rank">#{rank}</div>
                    <div className="result-info">
                      <div className="result-label">{cluster.label}</div>
                      <div className="result-meta">
                        {cluster.cluesCovered.size} clues |{' '}
                        {cluster.matches.length} matches |{' '}
                        {cluster.centerLat.toFixed(2)}, {cluster.centerLng.toFixed(2)}
                      </div>
                    </div>
                    <div
                      className="result-score"
                      style={{ color: getScoreColor(cluster.score) }}
                    >
                      {cluster.score}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="result-details">
                      {/* Score Breakdown */}
                      <div className="score-breakdown">
                        <div className="score-row">
                          <span>Clue Diversity ({cluster.cluesCovered.size}/10)</span>
                          <span>{bd.clueDiversity}</span>
                        </div>
                        <div className="score-row">
                          <span>Proximity</span>
                          <span>{bd.clueProximity}</span>
                        </div>
                        <div className="score-row">
                          <span>Constraints</span>
                          <span>{bd.constraintScore}</span>
                        </div>
                        <div className="score-row">
                          <span>Celestial Align</span>
                          <span>{bd.celestialAlignment}</span>
                        </div>
                        <div className="score-row">
                          <span>Theory Bonus</span>
                          <span>{bd.theoryBonus}</span>
                        </div>
                      </div>

                      {/* Clues Covered */}
                      <div className="clues-covered">
                        <strong>Clues matched: </strong>
                        {Array.from(cluster.cluesCovered).map(c => (
                          <span key={c} className="clue-badge">{c}</span>
                        ))}
                      </div>

                      {/* Sample Matches */}
                      <div className="sample-matches">
                        <strong>Top matches:</strong>
                        <ul>
                          {cluster.matches.slice(0, 8).map((m, j) => (
                            <li key={j}>
                              <span className="match-clue">[{m.clueCategory}]</span>{' '}
                              {m.featureName}
                              {m.featureType && (
                                <span className="match-type"> ({m.featureType})</span>
                              )}
                            </li>
                          ))}
                          {cluster.matches.length > 8 && (
                            <li className="more-matches">
                              ...and {cluster.matches.length - 8} more
                            </li>
                          )}
                        </ul>
                      </div>

                      <button
                        className="secondary-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZoomToCluster(cluster);
                        }}
                      >
                        Zoom to Area
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Methodology */}
      <div className="panel-section">
        <h4>How It Works</h4>
        <ol className="solver-method-list">
          <li>Searches GNIS database for all poem clue keywords (bear, bride, granite, arch, hole, face, water, wisdom, pole, hope)</li>
          <li>Clusters nearby matches within a {'\u007E'}30 mile radius</li>
          <li>Filters to areas with 2+ clue category matches</li>
          <li>Scores by: clue diversity (35%), proximity (20%), constraint satisfaction (25%), celestial alignment (10%), theory match (10%)</li>
          <li>Ranks and displays top 25 candidates on the map</li>
        </ol>
      </div>
    </div>
  );
}
