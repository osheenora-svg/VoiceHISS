/**
 * Percentage of schema fields that are actually filled in, for the
 * completeness meter (AI draft % vs after-review %). A medication group only
 * counts as "filled" if every row is fully filled in — a half-finished row
 * shouldn't read as complete.
 */

const SCALAR_KEYS = [
  'chiefComplaint',
  'duration',
  'temperature',
  'bloodPressure',
  'allergies',
  'examination',
  'diagnosis',
  'followUp'
];

function isFilled(value) {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

export function computeCompleteness(formValues) {
  const totalFields = SCALAR_KEYS.length + 1 /* icd10Suggestion */ + 1 /* medications, as one group */;
  let filled = 0;

  for (const key of SCALAR_KEYS) {
    if (isFilled(formValues[key])) filled += 1;
  }

  if (isFilled(formValues.icd10Suggestion)) filled += 1;

  const medications = Array.isArray(formValues.medications) ? formValues.medications : [];
  const medicationsComplete =
    medications.length > 0 && medications.every((m) => isFilled(m.name) && isFilled(m.dose) && isFilled(m.frequency));
  if (medicationsComplete) filled += 1;

  return Math.round((filled / totalFields) * 100);
}
