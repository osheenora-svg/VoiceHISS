import React from 'react';

export default function CompletenessMeter({ before, after }) {
  return (
    <div className="completeness-meter">
      <div className="completeness-row">
        <span className="completeness-label">AI draft</span>
        <div className="completeness-bar-track">
          <div className="completeness-bar-fill completeness-bar-fill--ai" style={{ width: `${before}%` }} />
        </div>
        <span className="completeness-pct">{before}%</span>
      </div>
      <div className="completeness-row">
        <span className="completeness-label">After review</span>
        <div className="completeness-bar-track">
          <div className="completeness-bar-fill completeness-bar-fill--review" style={{ width: `${after}%` }} />
        </div>
        <span className="completeness-pct">{after}%</span>
      </div>
    </div>
  );
}
