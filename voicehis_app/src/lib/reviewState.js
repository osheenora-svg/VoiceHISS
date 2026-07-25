/**
 * Bridges the AI extraction draft (value/confidence-wrapped, see extract.js)
 * and the plain, editable review-form state the ReviewForm component works
 * with. Keeping this translation in one pure module means the diffing logic
 * needed for the audit trail can be unit-tested without React.
 */

const SCALAR_FIELDS = [
  'chiefComplaint',
  'duration',
  'temperature',
  'bloodPressure',
  'allergies',
  'examination',
  'diagnosis',
  'followUp'
];

/**
 * Converts one AI draft (as returned by runExtraction) into:
 *  - formValues: plain, editable values a human can type into inputs
 *  - confidenceMap: per-field confidence, for amber highlighting
 *  - icd10Candidates: up to 3 {code,label} suggestions for the dropdown
 *
 * icd10Suggestion in formValues starts as null on purpose — per the brief,
 * the AI's candidates are suggestions only; a human must actively pick one
 * (or leave it cleared), it is never auto-accepted.
 */
export function draftToReviewForm(draft) {
  const formValues = {};
  const confidenceMap = {};

  for (const key of SCALAR_FIELDS) {
    formValues[key] = draft[key]?.value ?? null;
    confidenceMap[key] = draft[key]?.confidence ?? null;
  }

  formValues.icd10Suggestion = null;
  confidenceMap.icd10Suggestion = null;

  const icd10Candidates = Array.isArray(draft.icd10Suggestion?.value) ? draft.icd10Suggestion.value : [];

  formValues.medications = (Array.isArray(draft.medications) ? draft.medications : []).map((med) => ({
    name: med.name?.value ?? null,
    dose: med.dose?.value ?? null,
    frequency: med.frequency?.value ?? null
  }));
  confidenceMap.medications = (Array.isArray(draft.medications) ? draft.medications : []).map((med) => ({
    name: med.name?.confidence ?? null,
    dose: med.dose?.confidence ?? null,
    frequency: med.frequency?.confidence ?? null
  }));

  return { formValues, confidenceMap, icd10Candidates };
}

/**
 * True if a field should be amber-highlighted: no value at all, or the AI
 * was only "low" confidence about it. ("medium" confidence is not amber —
 * only null/low, per the brief.)
 */
export function isAmberField(value, confidence) {
  const isEmpty = value === null || value === undefined || String(value).trim().length === 0;
  return isEmpty || confidence === 'low';
}

function valuesEqual(a, b) {
  const na = a === undefined ? null : a;
  const nb = b === undefined ? null : b;
  if (typeof na === 'string' && typeof nb === 'string') {
    return na.trim() === nb.trim();
  }
  return na === nb;
}

/**
 * Compares the original AI-draft form values against the human-edited
 * current values and returns a flat list of every field, marking which ones
 * were touched. This is the edit diff the audit trail needs.
 *
 * Returns an array of:
 *   { field, aiValue, humanValue, edited }
 * where `field` is a human-readable path like "diagnosis" or
 * "medications[0].dose", or "icd10Suggestion" (special-cased since the AI
 * value there is a list of candidates, not a single value).
 */
export function computeEditDiff(aiFormValues, currentFormValues, icd10Candidates = []) {
  const diff = [];

  for (const key of SCALAR_FIELDS) {
    const aiValue = aiFormValues[key] ?? null;
    const humanValue = currentFormValues[key] ?? null;
    diff.push({
      field: key,
      aiValue,
      humanValue,
      edited: !valuesEqual(aiValue, humanValue)
    });
  }

  // icd10Suggestion: the AI never fills this in the form (it's suggestion-only),
  // so "edited" here really means "the human made a selection at all".
  diff.push({
    field: 'icd10Suggestion',
    aiValue: null,
    aiCandidates: icd10Candidates,
    humanValue: currentFormValues.icd10Suggestion ?? null,
    edited: Boolean(currentFormValues.icd10Suggestion)
  });

  const aiMeds = Array.isArray(aiFormValues.medications) ? aiFormValues.medications : [];
  const humanMeds = Array.isArray(currentFormValues.medications) ? currentFormValues.medications : [];
  const maxLen = Math.max(aiMeds.length, humanMeds.length);

  for (let i = 0; i < maxLen; i++) {
    const aiMed = aiMeds[i] || { name: null, dose: null, frequency: null };
    const humanMed = humanMeds[i] || { name: null, dose: null, frequency: null };
    for (const sub of ['name', 'dose', 'frequency']) {
      const aiValue = aiMed[sub] ?? null;
      const humanValue = humanMed[sub] ?? null;
      diff.push({
        field: `medications[${i}].${sub}`,
        aiValue,
        humanValue,
        edited: !valuesEqual(aiValue, humanValue)
      });
    }
  }

  return diff;
}

export { SCALAR_FIELDS };
