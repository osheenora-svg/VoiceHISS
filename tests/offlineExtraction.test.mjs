import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runExtraction } from '../src/lib/extract.js';
import { matchOfflineSample, OFFLINE_EXTRACTIONS } from '../src/data/offlineExtractions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaJsonText = fs.readFileSync(path.join(__dirname, '..', 'schema.json'), 'utf8');
const requiredKeys = Object.keys(JSON.parse(schemaJsonText));

const sampleTexts = {
  sample1: fs.readFileSync(path.join(__dirname, '..', 'samples', 'sample1_clinical_en.txt'), 'utf8'),
  sample2: fs.readFileSync(path.join(__dirname, '..', 'samples', 'sample2_arabic_english_mix.txt'), 'utf8'),
  sample3: fs.readFileSync(path.join(__dirname, '..', 'samples', 'sample3_patient_dictation.txt'), 'utf8')
};

// Save/restore ANTHROPIC_API_KEY around every test in this file so the
// offline path is exercised deterministically regardless of the ambient
// shell environment.
const originalKey = process.env.ANTHROPIC_API_KEY;
function forceNoKey() {
  delete process.env.ANTHROPIC_API_KEY;
}
function restoreKey() {
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
}

test('matchOfflineSample matches each of the 3 bundled samples exactly', () => {
  for (const id of Object.keys(sampleTexts)) {
    assert.equal(matchOfflineSample(sampleTexts[id], sampleTexts), id);
  }
});

test('matchOfflineSample returns null for unrecognized text (never fabricates a match)', () => {
  assert.equal(matchOfflineSample('Completely unrelated transcript text.', sampleTexts), null);
});

test('OFFLINE_EXTRACTIONS has all required schema keys for every sample', () => {
  for (const id of Object.keys(sampleTexts)) {
    const data = OFFLINE_EXTRACTIONS[id];
    for (const key of requiredKeys) {
      assert.ok(key in data, `${id} missing key "${key}"`);
    }
  }
});

test('offline extraction of sample 1 returns high-confidence populated fields (no ambiguity in the source)', async () => {
  forceNoKey();
  const result = await runExtraction({
    transcript: sampleTexts.sample1,
    schemaJsonText,
    offlineSampleTexts: sampleTexts
  });
  restoreKey();

  assert.equal(result.status, 'ok');
  assert.equal(result.offline, true);
  assert.equal(result.offlineSampleId, 'sample1');
  assert.equal(result.data.diagnosis.value, 'Acute pharyngitis');
  assert.equal(result.data.bloodPressure.value, '120/80 mmHg');
});

test('offline extraction of sample 3 leaves diagnosis and bloodPressure null (never stated by the patient)', async () => {
  forceNoKey();
  const result = await runExtraction({
    transcript: sampleTexts.sample3,
    schemaJsonText,
    offlineSampleTexts: sampleTexts
  });
  restoreKey();

  assert.equal(result.status, 'ok');
  assert.equal(result.data.bloodPressure.value, null);
  assert.equal(result.data.diagnosis.value, null);
  assert.deepEqual(result.data.icd10Suggestion.value, []);
});

test('offline mode returns a readable error (not fabricated data) for an unrecognized transcript', async () => {
  forceNoKey();
  const result = await runExtraction({
    transcript: 'Patient has a headache, no other details given.',
    schemaJsonText,
    offlineSampleTexts: sampleTexts
  });
  restoreKey();

  assert.equal(result.status, 'error');
  assert.match(result.message, /doesn't match one of the 3 bundled offline samples/);
});

test('offline fallback never activates when an API key IS configured (falls through toward the live path)', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key-not-a-real-key';
  // With a key "configured", runExtraction must attempt the live path, not
  // the offline shortcut — even for a transcript that matches a sample
  // exactly. We don't have network access in this sandbox, so the live call
  // will fail, but the important assertion is that it did NOT return the
  // offline-flagged result — proving the offline branch was skipped.
  const result = await runExtraction({
    transcript: sampleTexts.sample1,
    schemaJsonText,
    offlineSampleTexts: sampleTexts
  });
  restoreKey();

  assert.notEqual(result.offline, true);
});
