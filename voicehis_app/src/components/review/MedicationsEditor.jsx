import React from 'react';
import { isAmberField } from '../../lib/reviewState.js';

export default function MedicationsEditor({ medications, confidenceRows, errors, onChange, disabled = false }) {
  function updateRow(index, subfield, value) {
    const next = medications.map((m, i) => (i === index ? { ...m, [subfield]: value } : m));
    onChange(next);
  }

  function addRow() {
    onChange([...medications, { name: '', dose: '', frequency: '' }]);
  }

  function removeRow(index) {
    onChange(medications.filter((_, i) => i !== index));
  }

  return (
    <div className="medications-editor">
      <div className="review-field-label">Medications</div>
      {medications.length === 0 && <p className="review-field-hint">No medications recorded.</p>}

      {medications.map((med, index) => {
        const conf = confidenceRows[index] || {};
        const rowErrors = {
          name: errors[`medications[${index}].name`],
          dose: errors[`medications[${index}].dose`],
          frequency: errors[`medications[${index}].frequency`]
        };
        return (
          <div className="medication-row" key={index}>
            <div className={`med-cell ${isAmberField(med.name, conf.name) ? 'med-cell--amber' : ''}`}>
              <label>Name</label>
              <input value={med.name ?? ''} onChange={(e) => updateRow(index, 'name', e.target.value)} disabled={disabled} />
              {rowErrors.name && <p className="review-field-error">{rowErrors.name}</p>}
            </div>
            <div className={`med-cell ${isAmberField(med.dose, conf.dose) ? 'med-cell--amber' : ''}`}>
              <label>Dose</label>
              <input value={med.dose ?? ''} onChange={(e) => updateRow(index, 'dose', e.target.value)} disabled={disabled} />
              {rowErrors.dose && <p className="review-field-error">{rowErrors.dose}</p>}
            </div>
            <div className={`med-cell ${isAmberField(med.frequency, conf.frequency) ? 'med-cell--amber' : ''}`}>
              <label>Frequency</label>
              <input
                value={med.frequency ?? ''}
                onChange={(e) => updateRow(index, 'frequency', e.target.value)}
                disabled={disabled}
              />
              {rowErrors.frequency && <p className="review-field-error">{rowErrors.frequency}</p>}
            </div>
            <button
              type="button"
              className="btn btn-link med-remove-btn"
              onClick={() => removeRow(index)}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        );
      })}

      <button type="button" className="btn btn-secondary" onClick={addRow} disabled={disabled}>
        + Add medication
      </button>
    </div>
  );
}
