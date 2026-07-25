/**
 * Deterministic validation for the review form. Nothing here calls the AI —
 * these are the rules that actually gate "Confirm & sign", per CLAUDE.md's
 * conventions ("the AI never blocks the confirm button — only validators.js
 * does").
 *
 * Each validator returns an error message string, or null if the field is
 * valid. `validateAll` runs them over a review-form-shaped object (see
 * reviewState.js) and returns { errors: {fieldKey: message}, isValid }.
 */

const REQUIRED_TOP_LEVEL_FIELDS = ['chiefComplaint', 'diagnosis'];

const DOSE_FORMAT_RE = /^\s*\d+(\.\d+)?\s?(mg|g|mcg|µg|ml|mL|l|L|IU|unit|units|tablet|tablets|capsule|capsules|puff|puffs|drop|drops)\s*$/i;

const FREQUENCY_MIN_LENGTH = 3;

export function validateRequiredField(value, label) {
  if (value === null || value === undefined || String(value).trim().length === 0) {
    return `${label} is required.`;
  }
  return null;
}

export function validateTemperature(value) {
  if (value === null || value === undefined || String(value).trim().length === 0) {
    return null; // optional field — null is a legitimate reviewed state, not an error
  }
  const match = String(value).match(/(-?\d+(\.\d+)?)\s*°?\s*(C|F)?/i);
  if (!match) {
    return 'Temperature should be a number, e.g. "38.2°C".';
  }
  const num = parseFloat(match[1]);
  const unit = (match[3] || 'C').toUpperCase();
  if (unit === 'F') {
    if (num < 90 || num > 110) {
      return 'Temperature out of plausible range (90–110°F).';
    }
  } else {
    if (num < 30 || num > 43) {
      return 'Temperature out of plausible range (30–43°C).';
    }
  }
  return null;
}

export function validateBloodPressure(value) {
  if (value === null || value === undefined || String(value).trim().length === 0) {
    return null; // optional field
  }
  const match = String(value).match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) {
    return 'Blood pressure should be in the form "120/80 mmHg".';
  }
  const systolic = parseInt(match[1], 10);
  const diastolic = parseInt(match[2], 10);
  if (systolic < 60 || systolic > 260) {
    return 'Systolic value out of plausible range (60–260 mmHg).';
  }
  if (diastolic < 30 || diastolic > 150) {
    return 'Diastolic value out of plausible range (30–150 mmHg).';
  }
  if (diastolic >= systolic) {
    return 'Diastolic value should be lower than systolic.';
  }
  return null;
}

export function validateDoseFormat(value) {
  if (value === null || value === undefined || String(value).trim().length === 0) {
    return 'Dose is required for each medication.';
  }
  if (!DOSE_FORMAT_RE.test(value)) {
    return 'Dose should be a number + unit, e.g. "500 mg".';
  }
  return null;
}

export function validateMedicationRow(med) {
  const errors = {};
  const nameErr = validateRequiredField(med.name, 'Medication name');
  if (nameErr) errors.name = nameErr;

  const doseErr = validateDoseFormat(med.dose);
  if (doseErr) errors.dose = doseErr;

  if (!med.frequency || String(med.frequency).trim().length < FREQUENCY_MIN_LENGTH) {
    errors.frequency = 'Frequency is required, e.g. "three times daily for 7 days".';
  }

  return errors;
}

/**
 * Validates a review-form-shaped object (see reviewState.js#draftToReviewForm).
 * Returns { errors, isValid }. `errors` is keyed by top-level field name for
 * scalars, and by `medications[<index>].<subfield>` for medication rows, so
 * the UI can point at the exact inline location.
 */
export function validateAll(formValues) {
  const errors = {};

  for (const key of REQUIRED_TOP_LEVEL_FIELDS) {
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    const err = validateRequiredField(formValues[key], label.trim());
    if (err) errors[key] = err;
  }

  const tempErr = validateTemperature(formValues.temperature);
  if (tempErr) errors.temperature = tempErr;

  const bpErr = validateBloodPressure(formValues.bloodPressure);
  if (bpErr) errors.bloodPressure = bpErr;

  const medications = Array.isArray(formValues.medications) ? formValues.medications : [];
  medications.forEach((med, index) => {
    const rowErrors = validateMedicationRow(med);
    for (const [field, message] of Object.entries(rowErrors)) {
      errors[`medications[${index}].${field}`] = message;
    }
  });

  return { errors, isValid: Object.keys(errors).length === 0 };
}

export function validateReviewerName(name) {
  return validateRequiredField(name, 'Reviewer name');
}
