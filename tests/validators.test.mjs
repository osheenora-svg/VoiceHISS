import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTemperature,
  validateBloodPressure,
  validateDoseFormat,
  validateMedicationRow,
  validateAll,
  validateReviewerName
} from '../src/lib/validators.js';

function baseFormValues(overrides = {}) {
  return {
    chiefComplaint: 'Sore throat',
    duration: 'three days',
    temperature: '38.2°C',
    bloodPressure: '120/80 mmHg',
    allergies: 'No known allergies',
    examination: 'Red inflamed tonsils',
    diagnosis: 'Acute pharyngitis',
    icd10Suggestion: null,
    medications: [{ name: 'Amoxicillin', dose: '500 mg', frequency: 'three times daily for seven days' }],
    followUp: 'Follow-up in one week if symptoms persist',
    ...overrides
  };
}

test('validateTemperature accepts a plausible Celsius value', () => {
  assert.equal(validateTemperature('38.2°C'), null);
});

test('validateTemperature rejects an implausible value', () => {
  assert.match(validateTemperature('85°C'), /out of plausible range/);
});

test('validateTemperature treats null as valid (optional field)', () => {
  assert.equal(validateTemperature(null), null);
});

test('validateBloodPressure accepts a well-formed reading', () => {
  assert.equal(validateBloodPressure('120/80 mmHg'), null);
});

test('validateBloodPressure rejects malformed input', () => {
  assert.match(validateBloodPressure('not a bp'), /form "120\/80 mmHg"/);
});

test('validateBloodPressure rejects diastolic >= systolic', () => {
  assert.match(validateBloodPressure('80/120 mmHg'), /lower than systolic/);
});

test('validateDoseFormat accepts "500 mg"', () => {
  assert.equal(validateDoseFormat('500 mg'), null);
});

test('validateDoseFormat rejects a dose with no unit', () => {
  assert.match(validateDoseFormat('500'), /number \+ unit/);
});

test('validateDoseFormat rejects empty dose', () => {
  assert.match(validateDoseFormat(''), /required/);
});

test('validateMedicationRow flags every missing subfield independently', () => {
  const errors = validateMedicationRow({ name: '', dose: '500', frequency: '' });
  assert.ok(errors.name);
  assert.ok(errors.dose);
  assert.ok(errors.frequency);
});

test('validateAll passes for a fully valid form', () => {
  const { isValid, errors } = validateAll(baseFormValues());
  assert.deepEqual(errors, {});
  assert.equal(isValid, true);
});

test('validateAll blocks on missing required top-level field', () => {
  const { isValid, errors } = validateAll(baseFormValues({ diagnosis: '' }));
  assert.equal(isValid, false);
  assert.ok(errors.diagnosis);
});

test('validateAll reports medication row errors with an indexed key', () => {
  const { isValid, errors } = validateAll(
    baseFormValues({ medications: [{ name: 'Amoxicillin', dose: 'bad-dose', frequency: 'daily' }] })
  );
  assert.equal(isValid, false);
  assert.ok(errors['medications[0].dose']);
});

test('validateAll does not require bloodPressure/temperature (optional if genuinely unstated)', () => {
  const { isValid } = validateAll(baseFormValues({ bloodPressure: null, temperature: null }));
  assert.equal(isValid, true);
});

test('validateReviewerName requires a non-empty name', () => {
  assert.ok(validateReviewerName(''));
  assert.ok(validateReviewerName('   '));
  assert.equal(validateReviewerName('Dr. Amina Youssef'), null);
});
