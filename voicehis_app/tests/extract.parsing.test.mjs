import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExtractionResponse } from '../src/lib/extract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaJsonText = fs.readFileSync(path.join(__dirname, '..', 'schema.json'), 'utf8');
const requiredKeys = Object.keys(JSON.parse(schemaJsonText));

function validDraft(overrides = {}) {
  return {
    chiefComplaint: { value: 'Sore throat', confidence: 'high' },
    duration: { value: 'three days', confidence: 'high' },
    temperature: { value: '38.2°C', confidence: 'high' },
    bloodPressure: { value: '120/80 mmHg', confidence: 'high' },
    allergies: { value: 'No known allergies', confidence: 'high' },
    examination: { value: 'Red inflamed tonsils', confidence: 'high' },
    diagnosis: { value: 'Acute pharyngitis', confidence: 'high' },
    icd10Suggestion: { value: [{ code: 'J02.9', label: 'Acute pharyngitis, unspecified' }], confidence: 'medium' },
    medications: [
      {
        name: { value: 'Amoxicillin', confidence: 'high' },
        dose: { value: '500 mg', confidence: 'high' },
        frequency: { value: 'three times daily for seven days', confidence: 'high' }
      }
    ],
    followUp: { value: 'Follow-up in one week if symptoms persist', confidence: 'high' },
    ...overrides
  };
}

test('parses a clean JSON object with all required keys', () => {
  const raw = JSON.stringify(validDraft());
  const result = parseExtractionResponse(raw, schemaJsonText);
  assert.equal(result.status, 'ok');
  for (const key of requiredKeys) {
    assert.ok(key in result.data, `expected key "${key}" in parsed data`);
  }
});

test('strips ```json code fences before parsing', () => {
  const raw = '```json\n' + JSON.stringify(validDraft()) + '\n```';
  const result = parseExtractionResponse(raw, schemaJsonText);
  assert.equal(result.status, 'ok');
});

test('strips plain ``` code fences before parsing', () => {
  const raw = '```\n' + JSON.stringify(validDraft()) + '\n```';
  const result = parseExtractionResponse(raw, schemaJsonText);
  assert.equal(result.status, 'ok');
});

test('returns a readable error state for malformed JSON instead of throwing', () => {
  const raw = '{ this is not valid json ';
  assert.doesNotThrow(() => parseExtractionResponse(raw, schemaJsonText));
  const result = parseExtractionResponse(raw, schemaJsonText);
  assert.equal(result.status, 'error');
  assert.match(result.message, /not valid JSON/i);
  assert.equal(result.raw, raw);
});

test('returns a readable error state when required keys are missing', () => {
  const draft = validDraft();
  delete draft.diagnosis;
  const raw = JSON.stringify(draft);
  const result = parseExtractionResponse(raw, schemaJsonText);
  assert.equal(result.status, 'error');
  assert.match(result.message, /diagnosis/);
});

test('returns a readable error state when medications is not an array', () => {
  const draft = validDraft({ medications: null });
  const raw = JSON.stringify(draft);
  const result = parseExtractionResponse(raw, schemaJsonText);
  assert.equal(result.status, 'error');
  assert.match(result.message, /medications/);
});

test('returns a readable error state for an empty response', () => {
  const result = parseExtractionResponse('', schemaJsonText);
  assert.equal(result.status, 'error');
});
