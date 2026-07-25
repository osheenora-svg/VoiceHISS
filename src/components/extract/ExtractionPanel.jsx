import React, { useState } from 'react';
import schemaJsonText from '../../schema/schema.json?raw';
import sample1Text from '../../../samples/sample1_clinical_en.txt?raw';
import sample2Text from '../../../samples/sample2_arabic_english_mix.txt?raw';
import sample3Text from '../../../samples/sample3_patient_dictation.txt?raw';
import { runExtraction } from '../../lib/extract.js';
import { hasApiKey } from '../../lib/anthropicClient.js';
import ExtractionResult from './ExtractionResult.jsx';

const OFFLINE_SAMPLE_TEXTS = { sample1: sample1Text, sample2: sample2Text, sample3: sample3Text };

export default function ExtractionPanel({ transcript, onExtracted }) {
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [result, setResult] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const canExtract = transcript.trim().length > 0 && status !== 'loading';
  const offlineMode = !hasApiKey();

  async function handleExtract() {
    setStatus('loading');
    setResult(null);
    const outcome = await runExtraction({ transcript, schemaJsonText, offlineSampleTexts: OFFLINE_SAMPLE_TEXTS });
    setStatus(outcome.status);
    setResult(outcome);
    if (outcome.status === 'ok' && onExtracted) {
      onExtracted(outcome.data, new Date().toISOString());
    }
  }

  return (
    <section className="panel">
      <h2>2. Extract</h2>
      <p className="next-step-note">
        Sends the transcript to the model with the schema embedded in the system prompt.
        Anything not explicitly stated comes back as <code>null</code> — nothing is guessed.
      </p>

      {offlineMode && (
        <p className="offline-banner">
          ⚠ No API key configured — offline demo mode is active. Extraction only works on the
          3 bundled samples; set <code>VITE_ANTHROPIC_API_KEY</code> to extract from any transcript.
        </p>
      )}

      <button type="button" className="btn btn-primary" onClick={handleExtract} disabled={!canExtract}>
        {status === 'loading' ? 'Extracting…' : 'Extract →'}
      </button>

      {status === 'error' && result && (
        <div className="extract-error" role="alert">
          <p className="extract-error-message">⚠ {result.message}</p>
          {result.raw && (
            <button type="button" className="btn btn-link" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? 'Hide raw response' : 'Show raw response'}
            </button>
          )}
          {showRaw && result.raw && <pre className="raw-response">{result.raw}</pre>}
        </div>
      )}

      {status === 'ok' && result?.data && (
        <>
          {result.offline && (
            <p className="offline-banner offline-banner--result">
              ✓ Offline demo data used ({result.offlineSampleId}) — no API call was made.
            </p>
          )}
          <ExtractionResult data={result.data} />
          <details className="raw-response-details">
            <summary>Raw JSON</summary>
            <pre className="raw-response">{JSON.stringify(result.data, null, 2)}</pre>
          </details>
        </>
      )}
    </section>
  );
}
