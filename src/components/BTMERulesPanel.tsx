import { useState } from 'react';
import { BTME_RULES, VALID_LAND_TYPES, STABLE_LAND_TYPES, POEM_CLUES, SEARCH_PROGRESS } from '../data/btmeRules';

type TabType = 'rules' | 'lands' | 'clues' | 'progress';

export function BTMERulesPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['location', 'elimination'])
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const rulesByCategory = BTME_RULES.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, typeof BTME_RULES>);

  const categoryLabels: Record<string, string> = {
    location: 'Location Rules',
    elimination: 'What to Eliminate',
    access: 'Access Requirements',
    safety: 'Safety Guidelines',
  };

  return (
    <div className="btme-rules-panel">
      <div className="btme-header">
        <h2>BTME Hunt Reference</h2>
        <span className="btme-subtitle">From JIBLE 5.0</span>
      </div>

      <div className="btme-tabs">
        <button
          className={activeTab === 'rules' ? 'active' : ''}
          onClick={() => setActiveTab('rules')}
        >
          Rules
        </button>
        <button
          className={activeTab === 'lands' ? 'active' : ''}
          onClick={() => setActiveTab('lands')}
        >
          Land Types
        </button>
        <button
          className={activeTab === 'clues' ? 'active' : ''}
          onClick={() => setActiveTab('clues')}
        >
          Poem Clues
        </button>
        <button
          className={activeTab === 'progress' ? 'active' : ''}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
      </div>

      <div className="btme-content">
        {activeTab === 'rules' && (
          <div className="rules-list">
            {Object.entries(rulesByCategory).map(([category, rules]) => (
              <div key={category} className="rule-category">
                <button
                  className="category-header"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="category-icon">
                    {expandedCategories.has(category) ? '▼' : '▶'}
                  </span>
                  <span className="category-name">{categoryLabels[category]}</span>
                  <span className="category-count">{rules.length}</span>
                </button>

                {expandedCategories.has(category) && (
                  <div className="category-rules">
                    {rules.map((rule) => (
                      <div key={rule.id} className={`rule-item confidence-${rule.confidence}`}>
                        <div className="rule-text">{rule.rule}</div>
                        <div className="rule-source">
                          {rule.source} ({rule.date})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'lands' && (
          <div className="lands-list">
            <div className="land-section">
              <h4>Valid Search Areas (Public Land)</h4>
              <ul>
                {VALID_LAND_TYPES.map((type) => (
                  <li key={type} className={STABLE_LAND_TYPES.includes(type as any) ? 'stable' : ''}>
                    {type}
                    {STABLE_LAND_TYPES.includes(type as any) && (
                      <span className="stable-badge">Stable</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="land-section">
              <h4>Most Stable Ownership</h4>
              <p className="land-note">
                Justin mentioned these have the "most stable ownership rights" -
                less likely to change hands or be leased for logging/mining.
              </p>
              <ul className="stable-list">
                {STABLE_LAND_TYPES.map((type) => (
                  <li key={type}>{type}</li>
                ))}
              </ul>
            </div>

            <div className="land-section warning">
              <h4>Eliminate These</h4>
              <ul>
                <li>Private Property</li>
                <li>Patented Mining Claims</li>
                <li>Areas requiring special permission</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'clues' && (
          <div className="clues-list">
            <p className="clues-intro">
              Key lines from the poem with notes from Justin's statements:
            </p>
            {POEM_CLUES.map((clue, index) => (
              <div key={index} className="clue-item">
                <div className="clue-line">"{clue.line}"</div>
                <div className="clue-note">{clue.note}</div>
              </div>
            ))}
            <div className="clues-note">
              <strong>Remember:</strong> Clues are in consecutive order, top to bottom.
              The poem contains at least 10 clues.
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="progress-list">
            <h4>Community Progress (as of JIBLE 5.0)</h4>
            <div className="progress-item">
              <span className="progress-label">First Stanza:</span>
              <span className="progress-value solved">{SEARCH_PROGRESS.firstStanza}</span>
            </div>
            <div className="progress-item">
              <span className="progress-label">Second Stanza:</span>
              <span className="progress-value partial">{SEARCH_PROGRESS.secondStanza}</span>
            </div>
            <div className="progress-item">
              <span className="progress-label">Checkpoint:</span>
              <span className="progress-value partial">{SEARCH_PROGRESS.checkpoint}</span>
            </div>
            <div className="progress-item">
              <span className="progress-label">Double Arcs:</span>
              <span className="progress-value unsolved">{SEARCH_PROGRESS.doubleArcs}</span>
            </div>
            <div className="progress-item">
              <span className="progress-label">Cipher:</span>
              <span className="progress-value unsolved">{SEARCH_PROGRESS.cipher}</span>
            </div>
            <div className="progress-item">
              <span className="progress-label">Technical Clue:</span>
              <span className="progress-value solved">{SEARCH_PROGRESS.technicalClue}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
