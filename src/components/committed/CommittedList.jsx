import React, { useState } from 'react';
import { downloadJson } from '../../lib/download.js';
import AuditTrailView from './AuditTrailView.jsx';

function RecordRow({ record }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="committed-record">
      <button type="button" className="committed-record-header" onClick={() => setExpanded((v) => !v)}>
        <span className="committed-record-summary">
          <strong>{record.reviewedValues.chiefComplaint || 'Untitled encounter'}</strong>
          {record.reviewedValues.diagnosis && <> — {record.reviewedValues.diagnosis}</>}
        </span>
        <span className="committed-record-meta">
          Signed by {record.reviewerName} · {new Date(record.confirmedAt).toLocaleString()} ·{' '}
          {record.completenessAfter}% complete
        </span>
        <span className="committed-record-toggle">{expanded ? '▲ Hide audit trail' : '▼ Show audit trail'}</span>
      </button>

      <div className="committed-record-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => downloadJson(`${record.id}-fhir-bundle.json`, record.fhirBundle)}
        >
          ⬇ Download JSON
        </button>
      </div>

      {expanded && <AuditTrailView record={record} />}
    </li>
  );
}

export default function CommittedList({ records }) {
  return (
    <section className="panel committed-panel">
      <h2>4. Committed records</h2>
      {records.length === 0 ? (
        <p className="review-field-hint">No records signed yet in this session.</p>
      ) : (
        <ul className="committed-list">
          {records.map((record) => (
            <RecordRow key={record.id} record={record} />
          ))}
        </ul>
      )}
      <p className="next-step-note committed-scope-note">
        Records are kept in memory for this browser session only (per the demo brief) — nothing is
        persisted to a server or local storage, and this list resets on page reload.
      </p>
    </section>
  );
}
