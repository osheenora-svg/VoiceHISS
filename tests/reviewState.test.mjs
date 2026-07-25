import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftToReviewForm, isAmberField, computeEditDiff } from '../src/lib/reviewState.js';

function sampleDraft(overrides = {}) {
  return {
    chiefComplaint: { value: 'Sore throat', confidence: 'high' },
    duration: { value: 'three days', confidence: 'high' },
    temperature: { value: '38.2°C', confidence: 'high' },
    bloodPressure: { value: null, confidence: null },
    allergies: { value: 'No known allergies', confidence: 'medium' },
    examination: { value: 'Red inflamed tonsils', confidence: 'low' },
    diagnosis: { value: 'Acute pharyngitis', confidence: 'high' },
    icd10Suggestion: { value: [{ code: 'J02.9', label: 'Acute pharyngitis, unspecified' }], confidence: 'medium' },
    medications: [{ name: { value: 'Amoxicillin', confidence: 'high' }, dose: { value: '500 mg', confidence: 'high' }, frequency: { value: 'three times daily', confidence: 'high' } }],
    followUp: { value: 'Follow-up in one week', confidence: 'high' },
    ...overrides
  };
}

test('draftToReviewForm maps AI values into plain editable fields', () => {
  const { formValues } = draftToReviewForm(sampleDraft());
  assert.equal(formValues.chiefComplaint, 'Sore throat');
  assert.equal(formValues.bloodPressure, null);
  assert.equal(formValues.medications[0].name, 'Amoxicillin');
});

test('draftToReviewForm never pre-selects icd10Suggestion — suggestion only', () => {
  const { formValues, icd10Candidates } = draftToReviewForm(sampleDraft());
  assert.equal(formValues.icd10Suggestion, null);
  assert.equal(icd10Candidates.length, 1);
  assert.equal(icd10Candidates[0].code, 'J02.9');
});

test('draftToReviewForm carries per-field confidence for highlighting', () => {
  const { confidenceMap } = draftToReviewForm(sampleDraft());
  assert.equal(confidenceMap.examination, 'low');
  assert.equal(confidenceMap.allergies, 'medium');
});

test('isAmberField is true for null value', () => {
  assert.equal(isAmberField(null, 'high'), true);
});

test('isAmberField is true for low confidence even with a value', () => {
  assert.equal(isAmberField('Red inflamed tonsils', 'low'), true);
});

test('isAmberField is false for a populated, non-low-confidence field', () => {
  assert.equal(isAmberField('Sore throat', 'high'), false);
});

test('isAmberField is false for medium confidence with a value (only null/low are amber)', () => {
  assert.equal(isAmberField('No known allergies', 'medium'), false);
});

test('computeEditDiff marks unedited fields as not edited', () => {
  const draft = sampleDraft();
  const { formValues } = draftToReviewForm(draft);
  const diff = computeEditDiff(formValues, formValues, []);
  const chief = diff.find((d) => d.field === 'chiefComplaint');
  assert.equal(chief.edited, false);
});

test('computeEditDiff detects a scalar field edit', () => {
  const draft = sampleDraft();
  const { formValues } = draftToReviewForm(draft);
  const edited = { ...formValues, diagnosis: 'Streptococcal pharyngitis' };
  const diff = computeEditDiff(formValues, edited, []);
  const entry = diff.find((d) => d.field === 'diagnosis');
  assert.equal(entry.edited, true);
  assert.equal(entry.aiValue, 'Acute pharyngitis');
  assert.equal(entry.humanValue, 'Streptococcal pharyngitis');
});

test('computeEditDiff detects a filled-in previously-null field (e.g. bloodPressure)', () => {
  const draft = sampleDraft();
  const { formValues } = draftToReviewForm(draft);
  const edited = { ...formValues, bloodPressure: '120/80 mmHg' };
  const diff = computeEditDiff(formValues, edited, []);
  const entry = diff.find((d) => d.field === 'bloodPressure');
  assert.equal(entry.edited, true);
  assert.equal(entry.aiValue, null);
});

test('computeEditDiff detects a medication subfield edit by index', () => {
  const draft = sampleDraft();
  const { formValues } = draftToReviewForm(draft);
  const edited = {
    ...formValues,
    medications: [{ ...formValues.medications[0], dose: '250 mg' }]
  };
  const diff = computeEditDiff(formValues, edited, []);
  const entry = diff.find((d) => d.field === 'medications[0].dose');
  assert.equal(entry.edited, true);
  assert.equal(entry.aiValue, '500 mg');
  assert.equal(entry.humanValue, '250 mg');
});

test('computeEditDiff treats a human ICD-10 pick as an edit, with candidates attached', () => {
  const draft = sampleDraft();
  const { formValues, icd10Candidates } = draftToReviewForm(draft);
  const edited = { ...formValues, icd10Suggestion: 'J02.9' };
  const diff = computeEditDiff(formValues, edited, icd10Candidates);
  const entry = diff.find((d) => d.field === 'icd10Suggestion');
  assert.equal(entry.edited, true);
  assert.equal(entry.humanValue, 'J02.9');
  assert.deepEqual(entry.aiCandidates, icd10Candidates);
});

test('computeEditDiff does not false-positive on whitespace-only differences', () => {
  const draft = sampleDraft();
  const { formValues } = draftToReviewForm(draft);
  const edited = { ...formValues, chiefComplaint: 'Sore throat  ' };
  const diff = computeEditDiff(formValues, edited, []);
  const entry = diff.find((d) => d.field === 'chiefComplaint');
  assert.equal(entry.edited, false);
});
