import React from 'react';

const FIELD_LABELS = {
  chiefComplaint: 'Chief complaint',
  duration: 'Duration',
  temperature: 'Temperature',
  bloodPressure: 'Blood pressure',
  allergies: 'Allergies',
  examination: 'Examination',
  diagnosis: 'Diagnosis',
  followUp: 'Follow-up'
};

function ConfidenceBadge({ confidence }) {
  if (!confidence) return <span className="confidence-badge confidence-null">no data</span>;
  return <span className={`confidence-badge confidence-${confidence}`}>{confidence}</span>;
}

function FieldRow({ label, field }) {
  const isNull = !field || field.value === null || field.value === undefined;
  return (
    <div className={`extract-field-row ${isNull ? 'extract-field-row--empty' : ''}`}>
      <span className="extract-field-label">{label}</span>
      <span className="extract-field-value">{isNull ? '— not stated —' : field.value}</span>
      <ConfidenceBadge confidence={field?.confidence} />
    </div>
  );
}

export default function ExtractionResult({ data }) {
  const meds = Array.isArray(data.medications) ? data.medications : [];
  const icd10 = data.icd10Suggestion?.value || [];

  return (
    <div className="extraction-result">
      {Object.entries(FIELD_LABELS).map(([key, label]) => (
        <FieldRow key={key} label={label} field={data[key]} />
      ))}

      <div className="extract-field-row extract-field-row--block">
        <span className="extract-field-label">ICD-10 candidates</span>
        <ConfidenceBadge confidence={data.icd10Suggestion?.confidence} />
        {icd10.length === 0 ? (
          <p className="extract-empty-note">— none suggested —</p>
        ) : (
          <ol className="icd10-candidate-list">
            {icd10.map((c, i) => (
              <li key={i}>
                <code>{c.code}</code> — {c.label}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="extract-field-row extract-field-row--block">
        <span className="extract-field-label">Medications</span>
        {meds.length === 0 ? (
          <p className="extract-empty-note">— none mentioned —</p>
        ) : (
          <ul className="medication-list">
            {meds.map((m, i) => (
              <li key={i}>
                <span>{m.name?.value ?? '—'}</span>
                <span>{m.dose?.value ?? '—'}</span>
                <span>{m.frequency?.value ?? '—'}</span>
                <ConfidenceBadge confidence={m.name?.confidence} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
