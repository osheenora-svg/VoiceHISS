import React, { useState } from 'react';
import schemaJsonText from '../../schema/schema.json?raw';
import { runExtraction } from '../../lib/extract.js';
import ExtractionResult from './ExtractionResult.jsx';

export default function ExtractionPanel({ transcript, onExtracted }) {
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [result, setResult] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const canExtract = transcript.trim().length > 0 && status !== 'loading';

  async function handleExtract() {
    setStatus('loading');
    setResult(null);
    const outcome = await runExtraction({ transcript, schemaJsonText });
    setStatus(outcome.status);
    setResult(outcome);
    if (outcome.status === 'ok' && onExtracted) {
      onExtracted(outcome.data);
    }
  }

  return (
    <section className="panel">
      <h2>2. Extract</h2>
      <p className="next-step-note">
        Sends the transcript to the model with the schema embedded in the system prompt.
        Anything not explicitly stated comes back as <code>null</code> — nothing is guessed.
      </p>

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
