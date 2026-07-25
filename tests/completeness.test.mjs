import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCompleteness } from '../src/lib/completeness.js';

test('returns 100 when every field including medications is fully filled', () => {
  const pct = computeCompleteness({
    chiefComplaint: 'Sore throat',
    duration: 'three days',
    temperature: '38.2°C',
    bloodPressure: '120/80 mmHg',
    allergies: 'No known allergies',
    examination: 'Red inflamed tonsils',
    diagnosis: 'Acute pharyngitis',
    icd10Suggestion: 'J02.9',
    medications: [{ name: 'Amoxicillin', dose: '500 mg', frequency: 'TID x7d' }],
    followUp: 'One week'
  });
  assert.equal(pct, 100);
});

test('returns 0 for a completely empty draft', () => {
  const pct = computeCompleteness({
    chiefComplaint: null,
    duration: null,
    temperature: null,
    bloodPressure: null,
    allergies: null,
    examination: null,
    diagnosis: null,
    icd10Suggestion: null,
    medications: [],
    followUp: null
  });
  assert.equal(pct, 0);
});

test('a medication group with a half-filled row does not count as complete', () => {
  const full = computeCompleteness({
    chiefComplaint: 'x',
    duration: 'x',
    temperature: 'x',
    bloodPressure: 'x',
    allergies: 'x',
    examination: 'x',
    diagnosis: 'x',
    icd10Suggestion: 'x',
    medications: [{ name: 'Amoxicillin', dose: '', frequency: 'TID' }],
    followUp: 'x'
  });
  // 9 of 10 groups filled (medications incomplete) = 90%
  assert.equal(full, 90);
});

test('sample-3-like draft (missing bp + diagnosis + icd10) scores below 100 but above 0', () => {
  const pct = computeCompleteness({
    chiefComplaint: 'Sore throat',
    duration: 'about three days',
    temperature: '38.2°C',
    bloodPressure: null,
    allergies: 'No known allergies',
    examination: 'Tonsils red',
    diagnosis: null,
    icd10Suggestion: null,
    medications: [{ name: 'Amoxicillin', dose: '500 mg', frequency: 'TID x7d' }],
    followUp: 'Return if not better after one week'
  });
  assert.ok(pct > 0 && pct < 100);
});

test('review completeness increases after a human fills in a previously-null field', () => {
  const before = computeCompleteness({
    chiefComplaint: 'Sore throat',
    duration: 'x',
    temperature: 'x',
    bloodPressure: null,
    allergies: 'x',
    examination: 'x',
    diagnosis: 'x',
    icd10Suggestion: 'x',
    medications: [{ name: 'x', dose: 'x', frequency: 'x' }],
    followUp: 'x'
  });
  const after = computeCompleteness({
    chiefComplaint: 'Sore throat',
    duration: 'x',
    temperature: 'x',
    bloodPressure: '120/80 mmHg',
    allergies: 'x',
    examination: 'x',
    diagnosis: 'x',
    icd10Suggestion: 'x',
    medications: [{ name: 'x', dose: 'x', frequency: 'x' }],
    followUp: 'x'
  });
  assert.ok(after > before);
});
