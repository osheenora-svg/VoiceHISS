import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFhirBundle } from '../src/lib/fhir.js';

function fullFormValues(overrides = {}) {
  return {
    chiefComplaint: 'Sore throat',
    duration: 'three days',
    temperature: '38.2°C',
    bloodPressure: '120/80 mmHg',
    allergies: 'No known allergies',
    examination: 'Red inflamed tonsils',
    diagnosis: 'Acute pharyngitis',
    icd10Suggestion: 'J02.9',
    medications: [{ name: 'Amoxicillin', dose: '500 mg', frequency: 'three times daily for seven days' }],
    followUp: 'Follow-up in one week',
    ...overrides
  };
}

const candidates = [
  { code: 'J02.9', label: 'Acute pharyngitis, unspecified' },
  { code: 'J03.90', label: 'Acute tonsillitis, unspecified' }
];

test('produces a Bundle with Patient, Encounter, Condition, Observations, and MedicationRequest', () => {
  const bundle = buildFhirBundle({
    formValues: fullFormValues(),
    icd10Candidates: candidates,
    reviewerName: 'Dr. Amina Youssef',
    confirmedAt: '2026-07-25T10:00:00.000Z',
    transcript: 'The patient presents with a sore throat...'
  });

  assert.equal(bundle.resourceType, 'Bundle');
  const types = bundle.entry.map((e) => e.resource.resourceType);
  assert.ok(types.includes('Patient'));
  assert.ok(types.includes('Encounter'));
  assert.ok(types.includes('Condition'));
  assert.ok(types.includes('MedicationRequest'));
  assert.ok(types.filter((t) => t === 'Observation').length >= 4);
});

test('attaches the selected ICD-10 coding to the Condition resource', () => {
  const bundle = buildFhirBundle({
    formValues: fullFormValues(),
    icd10Candidates: candidates,
    reviewerName: 'Dr. Amina Youssef',
    confirmedAt: '2026-07-25T10:00:00.000Z',
    transcript: 'transcript text'
  });
  const condition = bundle.entry.find((e) => e.resource.resourceType === 'Condition').resource;
  assert.equal(condition.code.coding[0].code, 'J02.9');
  assert.equal(condition.code.coding[0].display, 'Acute pharyngitis, unspecified');
});

test('never fabricates an Observation for a null field (e.g. missing blood pressure)', () => {
  const bundle = buildFhirBundle({
    formValues: fullFormValues({ bloodPressure: null }),
    icd10Candidates: candidates,
    reviewerName: 'Dr. Amina Youssef',
    confirmedAt: '2026-07-25T10:00:00.000Z',
    transcript: 'transcript text'
  });
  const bpObservation = bundle.entry.find(
    (e) => e.resource.resourceType === 'Observation' && e.resource.code.coding[0].code === '85354-9'
  );
  assert.equal(bpObservation, undefined);
});

test('omits Condition entirely when diagnosis is null (never fabricates a diagnosis)', () => {
  const bundle = buildFhirBundle({
    formValues: fullFormValues({ diagnosis: null, icd10Suggestion: null }),
    icd10Candidates: [],
    reviewerName: 'Dr. Amina Youssef',
    confirmedAt: '2026-07-25T10:00:00.000Z',
    transcript: 'transcript text'
  });
  assert.equal(bundle.entry.some((e) => e.resource.resourceType === 'Condition'), false);
});

test('records reviewer name and source transcript as bundle extensions', () => {
  const bundle = buildFhirBundle({
    formValues: fullFormValues(),
    icd10Candidates: candidates,
    reviewerName: 'Dr. Amina Youssef',
    confirmedAt: '2026-07-25T10:00:00.000Z',
    transcript: 'the source transcript text'
  });
  const reviewerExt = bundle.extension.find((e) => e.url.includes('reviewer'));
  const transcriptExt = bundle.extension.find((e) => e.url.includes('source-transcript'));
  assert.equal(reviewerExt.valueString, 'Dr. Amina Youssef');
  assert.equal(transcriptExt.valueString, 'the source transcript text');
});

test('the bundle is valid JSON when stringified (safe for the download button)', () => {
  const bundle = buildFhirBundle({
    formValues: fullFormValues(),
    icd10Candidates: candidates,
    reviewerName: 'Dr. Amina Youssef',
    confirmedAt: '2026-07-25T10:00:00.000Z',
    transcript: 'transcript with "quotes" and \n newlines'
  });
  const json = JSON.stringify(bundle);
  assert.doesNotThrow(() => JSON.parse(json));
});
