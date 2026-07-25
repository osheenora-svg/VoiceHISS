import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runExtraction } from '../src/lib/extract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaJsonText = fs.readFileSync(path.join(__dirname, '..', 'schema.json'), 'utf8');
const requiredKeys = Object.keys(JSON.parse(schemaJsonText));
const transcript1 = fs.readFileSync(
  path.join(__dirname, '..', 'samples', 'sample1_clinical_en.txt'),
  'utf8'
);

test('extraction on transcript 1 returns all required schema keys', { skip: !process.env.ANTHROPIC_API_KEY }, async (t) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    t.skip('Set ANTHROPIC_API_KEY to run this against the real API.');
    return;
  }

  const result = await runExtraction({ transcript: transcript1, schemaJsonText });

  assert.equal(result.status, 'ok', `expected ok, got: ${result.status} — ${result.message ?? ''}`);

  for (const key of requiredKeys) {
    assert.ok(key in result.data, `expected key "${key}" to exist in extracted data`);
  }

  // Sample 1 states every field explicitly, so none of them should come
  // back null — this is the strongest single check that the model is
  // reading the transcript rather than defaulting everything to null.
  const scalarKeys = requiredKeys.filter((k) => k !== 'medications' && k !== 'icd10Suggestion');
  for (const key of scalarKeys) {
    assert.notEqual(result.data[key]?.value, null, `expected "${key}" to be populated from an explicit transcript`);
  }

  assert.ok(Array.isArray(result.data.medications), 'medications should be an array');
  assert.ok(result.data.medications.length >= 1, 'expected at least one medication extracted');
});

// This test intentionally does NOT hit the network — it documents/guards the
// "leave unknown data null" rule using sample 3, which never mentions blood
// pressure. Also skipped without a key, for the same reason as above.
test(
  'extraction on transcript 3 leaves unmentioned blood pressure null (never fabricated)',
  { skip: !process.env.ANTHROPIC_API_KEY },
  async (t) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      t.skip('Set ANTHROPIC_API_KEY to run this against the real API.');
      return;
    }

    const transcript3 = fs.readFileSync(
      path.join(__dirname, '..', 'samples', 'sample3_patient_dictation.txt'),
      'utf8'
    );
    const result = await runExtraction({ transcript: transcript3, schemaJsonText });

    assert.equal(result.status, 'ok', `expected ok, got: ${result.status} — ${result.message ?? ''}`);
    assert.equal(
      result.data.bloodPressure?.value,
      null,
      'blood pressure was never stated in transcript 3 and must not be fabricated'
    );
  }
);
