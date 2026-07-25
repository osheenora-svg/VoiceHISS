import React from 'react';

export default function AuditTrailView({ record }) {
  const editedDiff = record.diff.filter((d) => d.edited);

  return (
    <div className="audit-trail">
      <div className="audit-section">
        <h4>Timestamps</h4>
        <ul className="audit-timestamps">
          <li>Extracted: {new Date(record.extractedAt).toLocaleString()}</li>
          <li>Signed: {new Date(record.confirmedAt).toLocaleString()}</li>
        </ul>
      </div>

      <div className="audit-section">
        <h4>Original transcript</h4>
        <pre className="raw-response audit-transcript">{record.transcript}</pre>
      </div>

      <div className="audit-section">
        <h4>AI draft (as extracted)</h4>
        <pre className="raw-response">{JSON.stringify(record.aiDraft, null, 2)}</pre>
      </div>

      <div className="audit-section">
        <h4>Human edits ({editedDiff.length})</h4>
        {editedDiff.length === 0 ? (
          <p className="review-field-hint">No fields were changed from the AI draft.</p>
        ) : (
          <ul className="edit-diff-list">
            {editedDiff.map((d) => (
              <li key={d.field}>
                <code>{d.field}</code>: <span className="diff-ai">{d.aiValue ?? '∅'}</span> →{' '}
                <span className="diff-human">{d.humanValue ?? '∅'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="audit-section">
        <h4>Final FHIR bundle</h4>
        <pre className="raw-response">{JSON.stringify(record.fhirBundle, null, 2)}</pre>
      </div>
    </div>
  );
}
