import React from 'react';

export default function Icd10Dropdown({ candidates, selectedCode, onChange, disabled = false }) {
  return (
    <div className="review-field-row">
      <label className="review-field-label">
        ICD-10 code
        <span className="amber-flag" title="AI suggestions only — you must choose or leave cleared">
          suggestion only
        </span>
      </label>
      <select
        className="review-field-input"
        value={selectedCode ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">— Not selected —</option>
        {candidates.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.label}
          </option>
        ))}
      </select>
      {candidates.length === 0 && <p className="review-field-hint">No AI candidates were suggested for this encounter.</p>}
    </div>
  );
}
