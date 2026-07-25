import React from 'react';
import { isAmberField } from '../../lib/reviewState.js';

export default function FieldRow({ label, value, confidence, onChange, error, multiline = false, disabled = false }) {
  const amber = isAmberField(value, confidence);
  const InputTag = multiline ? 'textarea' : 'input';

  return (
    <div className={`review-field-row ${amber ? 'review-field-row--amber' : ''} ${error ? 'review-field-row--error' : ''}`}>
      <label className="review-field-label">
        {label}
        {amber && (
          <span className="amber-flag" title="Not stated by the AI, or low confidence — please verify">
            needs review
          </span>
        )}
      </label>
      <InputTag
        className="review-field-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? 2 : undefined}
        disabled={disabled}
      />
      {error && <p className="review-field-error">{error}</p>}
    </div>
  );
}
