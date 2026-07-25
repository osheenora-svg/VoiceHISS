import React, { useMemo, useState } from 'react';
import { draftToReviewForm, computeEditDiff } from '../../lib/reviewState.js';
import { validateAll, validateReviewerName } from '../../lib/validators.js';
import { computeCompleteness } from '../../lib/completeness.js';
import { buildFhirBundle } from '../../lib/fhir.js';
import FieldRow from './FieldRow.jsx';
import Icd10Dropdown from './Icd10Dropdown.jsx';
import MedicationsEditor from './MedicationsEditor.jsx';
import CompletenessMeter from './CompletenessMeter.jsx';

const FIELD_CONFIG = [
  { key: 'chiefComplaint', label: 'Chief complaint' },
  { key: 'duration', label: 'Duration' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'bloodPressure', label: 'Blood pressure' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'examination', label: 'Examination', multiline: true },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'followUp', label: 'Follow-up', multiline: true }
];

export default function ReviewForm({ draft, extractedAt, transcript, onCommit, onStartNew }) {
  // AI draft mapped to editable state, computed once per draft (this is the
  // fixed baseline the edit diff and "before" completeness compare against).
  const initial = useMemo(() => draftToReviewForm(draft), [draft]);

  const [formValues, setFormValues] = useState(initial.formValues);
  const [reviewerName, setReviewerName] = useState('');
  const [confirmed, setConfirmed] = useState(null); // null | { reviewerName, confirmedAt, diff, fhirBundle }

  const { errors, isValid } = useMemo(() => validateAll(formValues), [formValues]);
  const reviewerError = confirmed ? null : validateReviewerName(reviewerName);

  const diff = useMemo(
    () => computeEditDiff(initial.formValues, formValues, initial.icd10Candidates),
    [initial, formValues]
  );
  const editedCount = diff.filter((d) => d.edited).length;

  const completenessBefore = useMemo(() => computeCompleteness(initial.formValues), [initial]);
  const completenessAfter = useMemo(() => computeCompleteness(formValues), [formValues]);

  function updateField(key, value) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirm() {
    if (!isValid || reviewerError) return;

    const confirmedAt = new Date().toISOString();
    const trimmedReviewer = reviewerName.trim();

    const fhirBundle = buildFhirBundle({
      formValues,
      icd10Candidates: initial.icd10Candidates,
      reviewerName: trimmedReviewer,
      confirmedAt,
      transcript
    });

    const record = {
      id: `rec-${Date.now()}`,
      transcript,
      aiDraft: draft,
      extractedAt,
      reviewedValues: formValues,
      diff,
      reviewerName: trimmedReviewer,
      confirmedAt,
      fhirBundle,
      completenessBefore,
      completenessAfter
    };

    setConfirmed({ reviewerName: trimmedReviewer, confirmedAt, diff, fhirBundle });
    if (onCommit) onCommit(record);
  }

  const locked = Boolean(confirmed);

  return (
    <section className="panel review-panel">
      <h2>3. Review</h2>
      <p className="next-step-note">
        Amber fields were not stated by the AI, or it was only low-confidence about them —
        please verify or fill them in. Everything below is editable.
      </p>

      <CompletenessMeter before={completenessBefore} after={completenessAfter} />

      <div className="review-fields-grid">
        {FIELD_CONFIG.map(({ key, label, multiline }) => (
          <FieldRow
            key={key}
            label={label}
            value={formValues[key]}
            confidence={initial.confidenceMap[key]}
            onChange={(v) => updateField(key, v)}
            error={errors[key]}
            multiline={multiline}
            disabled={locked}
          />
        ))}
      </div>

      <Icd10Dropdown
        candidates={initial.icd10Candidates}
        selectedCode={formValues.icd10Suggestion}
        onChange={(v) => updateField('icd10Suggestion', v)}
        disabled={locked}
      />

      <MedicationsEditor
        medications={formValues.medications}
        confidenceRows={initial.confidenceMap.medications}
        errors={errors}
        onChange={(meds) => updateField('medications', meds)}
        disabled={locked}
      />

      <div className="confirm-block">
        <div className="review-field-row">
          <label className="review-field-label">Reviewer name</label>
          <input
            className="review-field-input"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            disabled={locked}
            placeholder="Full name of the clinician signing this record"
          />
          {!locked && reviewerName.length > 0 && reviewerError && (
            <p className="review-field-error">{reviewerError}</p>
          )}
        </div>

        {!isValid && (
          <div className="validation-summary" role="alert">
            <p>{Object.keys(errors).length} field(s) need attention before this can be signed:</p>
            <ul>
              {Object.values(errors).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={locked || !isValid || Boolean(reviewerError)}
        >
          {locked ? '✓ Signed' : 'Confirm & sign'}
        </button>
      </div>

      {confirmed && (
        <div className="confirmed-summary">
          <p className="confirmed-headline">
            ✓ Signed by <strong>{confirmed.reviewerName}</strong> at{' '}
            {new Date(confirmed.confirmedAt).toLocaleString()}
          </p>
          <p className="next-step-note">
            {editedCount} field(s) were changed from the AI draft, and completeness went from{' '}
            {completenessBefore}% to {completenessAfter}%. This record was saved to Committed Records
            below, with the full audit trail and a FHIR bundle download.
          </p>
          {editedCount > 0 && (
            <ul className="edit-diff-list">
              {diff
                .filter((d) => d.edited)
                .map((d) => (
                  <li key={d.field}>
                    <code>{d.field}</code>: <span className="diff-ai">{d.aiValue ?? '∅'}</span> →{' '}
                    <span className="diff-human">{d.humanValue ?? '∅'}</span>
                  </li>
                ))}
            </ul>
          )}
          <button type="button" className="btn btn-secondary" onClick={onStartNew}>
            Start new encounter
          </button>
        </div>
      )}
    </section>
  );
}
