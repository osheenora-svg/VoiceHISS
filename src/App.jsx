import React, { useState } from 'react';
import RecorderPanel from './components/input/RecorderPanel.jsx';
import PasteTranscript from './components/input/PasteTranscript.jsx';
import SampleLoader from './components/input/SampleLoader.jsx';

export default function App() {
  const [transcript, setTranscript] = useState('');

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>VoiceHIS</h1>
        <p className="app-subtitle">
          Outpatient consultation intake — demo AI dictation to structured HIS entry
        </p>
      </header>

      <main className="input-page">
        <section className="panel">
          <h2>1. Capture the encounter</h2>

          <RecorderPanel onTranscriptChange={setTranscript} disabled={false} />

          <div className="divider">
            <span>or</span>
          </div>

          <PasteTranscript value={transcript} onChange={setTranscript} disabled={false} />

          <SampleLoader onLoad={setTranscript} disabled={false} />
        </section>

        <section className="panel panel--next-step">
          <h2>2. Extract</h2>
          <p className="next-step-note">
            Sends the transcript to the extraction step (schema-matched JSON with
            per-field confidence) — implemented next.
          </p>
          <button type="button" className="btn btn-primary" disabled title="Coming in the next build step">
            Extract →
          </button>
        </section>
      </main>
    </div>
  );
}
